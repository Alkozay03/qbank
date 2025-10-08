"use client";

import { useState, useRef, useCallback, useEffect, KeyboardEvent, ChangeEvent, DragEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import RichTextEditor from "@/components/RichTextEditor";
import TagSelector from "@/components/TagSelector";
import AdminQuestionComments from "@/components/AdminQuestionComments";
import Image from "next/image";
import { getTagLabel, type TagCategory } from "@/lib/tags/catalog";

type OccurrenceDraft = {
  id?: string;
  clientKey: string;
  year: string;
  rotation: string;
  orderIndex: number;
};

type RawOccurrenceInput = {
  id?: string;
  year?: string | null;
  rotation?: string | null;
  orderIndex?: number | null;
  clientKey?: string | null;
};

function makeOccurrenceKey() {
  const globalCrypto = typeof globalThis !== "undefined" ? (globalThis.crypto as Crypto | undefined) : undefined;
  if (globalCrypto && typeof globalCrypto.randomUUID === "function") {
    try {
      return `occ-${globalCrypto.randomUUID()}`;
    } catch {
      // fall through to random string below
    }
  }
  return `occ-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeOccurrencesForState(source?: RawOccurrenceInput[]): OccurrenceDraft[] {
  if (!Array.isArray(source)) return [];
  const seenKeys = new Set<string>();

  const cleaned = source
    .map((occ, index) => {
      const year = typeof occ?.year === "string" ? occ.year.trim() : "";
      const rotation = typeof occ?.rotation === "string" ? occ.rotation.trim() : "";
      const orderIndex =
        typeof occ?.orderIndex === "number" && Number.isFinite(occ.orderIndex) ? occ.orderIndex : index;
      const keyCandidateRaw =
        typeof occ?.clientKey === "string" && occ.clientKey.trim().length > 0
          ? occ.clientKey.trim()
          : occ?.id ?? makeOccurrenceKey();
      let keyCandidate = keyCandidateRaw;
      while (seenKeys.has(keyCandidate)) {
        keyCandidate = `${keyCandidateRaw}-${Math.random().toString(36).slice(2, 6)}`;
      }
      seenKeys.add(keyCandidate);
      return {
        id: occ?.id,
        year,
        rotation,
        orderIndex,
        clientKey: keyCandidate,
      };
    })
    .filter((occ) => occ.year.length > 0 || occ.rotation.length > 0)
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((occ, index) => ({ ...occ, orderIndex: index }));

  return cleaned;
}

function prepareOccurrencesForSave(occurrences: OccurrenceDraft[]) {
  return occurrences
    .map((occ, index) => ({
      id: occ.id,
      year: occ.year.trim(),
      rotation: occ.rotation.trim(),
      orderIndex: index,
    }))
    .filter((occ) => occ.year.length > 0 || occ.rotation.length > 0);
}

function normalizeOccurrencesForEditing(drafts?: Array<OccurrenceDraft | Partial<OccurrenceDraft>>) {
  if (!Array.isArray(drafts)) return [] as OccurrenceDraft[];
  const seenKeys = new Set<string>();

  return drafts.map((occ, index) => {
    const year = typeof occ?.year === "string" ? occ.year : "";
    const rotation = typeof occ?.rotation === "string" ? occ.rotation : "";
    const baseKey =
      typeof occ?.clientKey === "string" && occ.clientKey.trim().length > 0
        ? occ.clientKey.trim()
        : makeOccurrenceKey();
    let clientKey = baseKey;
    while (seenKeys.has(clientKey)) {
      clientKey = `${baseKey}-${Math.random().toString(36).slice(2, 6)}`;
    }
    seenKeys.add(clientKey);

    return {
      id: occ?.id,
      clientKey,
      year,
      rotation,
      orderIndex: index,
    } satisfies OccurrenceDraft;
  });
}

function derivePrimaryOccurrenceMeta(occurrences: OccurrenceDraft[]) {
  const prepared = prepareOccurrencesForSave(occurrences);
  const primary = prepared[0];
  return {
    questionYear: primary?.year ?? "",
    rotationNumber: primary?.rotation ?? "",
  };
}

function normalizeTagValues(tags?: string[]) {
  if (!Array.isArray(tags)) return [] as string[];
  return Array.from(
    new Set(
      tags
        .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
        .filter((tag) => tag.length > 0)
    )
  );
}

const DISPLAYABLE_TAG_CATEGORIES: ReadonlyArray<TagCategory> = ["rotation", "resource", "discipline", "system"];
const DISPLAYABLE_TAG_SET = new Set(DISPLAYABLE_TAG_CATEGORIES);

function tagLabelFromPair(raw: string): string | null {
  if (typeof raw !== "string") return null;
  const [category, value] = raw.split(":");
  if (!category || !value) return raw;
  const normalized = category.toLowerCase() as TagCategory;
  if (!DISPLAYABLE_TAG_SET.has(normalized)) return null;
  return getTagLabel(normalized, value) ?? value;
}

interface ExtractedQuestion {
  id: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  optionE?: string;
  correctAnswer: string;
  explanation: string;
  educationalObjective: string;
  references: string;
  tags: string[];
  rotation?: string;
  system?: string;
  discipline?: string;
  resource?: string;
  questionYear?: string;
  rotationNumber?: string;
  iduScreenshotUrl?: string;
  questionImageUrl?: string;
  explanationImageUrl?: string;
  occurrences?: OccurrenceDraft[];
  dbId?: string;
  customId?: number;
  source?: "extracted" | "manual" | "existing";
  isAnswerConfirmed?: boolean;
}

interface BulkUploadState {
  status: 'idle' | 'uploading' | 'extracting' | 'ready' | 'saving';
  progress: number;
  message: string;
  questions: ExtractedQuestion[];
  editingIndex: number | null;
}

const TAG_TYPE_TO_CATEGORY: Record<string, string> = {
  ROTATION: 'rotation',
  RESOURCE: 'resource',
  SUBJECT: 'discipline',
  SYSTEM: 'system',
  MODE: 'mode',
  TOPIC: 'topic',
};

interface MultipleReferencesEditorProps {
  references: string;
  onChange: (_references: string) => void;
}

function MultipleReferencesEditor({ references, onChange }: MultipleReferencesEditorProps) {
  const [referenceList, setReferenceList] = useState<string[]>(() => {
    if (!references) return [''];
    return references
      .replace(/\r/g, '')
      .split(/\n+|,|;|\u2022|\u2023|\u25E6/g)
      .map((ref) => ref.trim())
      .filter(Boolean)
      .reduce<string[]>((acc, ref) => (acc.includes(ref) ? acc : [...acc, ref]), []);
  });

  const updateReferences = (newList: string[]) => {
    setReferenceList(newList);
    const filteredList = newList.filter(ref => ref.trim() !== '');
    onChange(filteredList.join('\n'));
  };

  const addReference = () => {
    updateReferences([...referenceList, '']);
  };

  const removeReference = (index: number) => {
    if (referenceList.length > 1) {
      updateReferences(referenceList.filter((_, i) => i !== index));
    }
  };

  const updateReference = (index: number, value: string) => {
    const newList = [...referenceList];
    newList[index] = value;
    updateReferences(newList);
  };

  return (
    <div className="space-y-2">
      {referenceList.map((ref, index) => (
        <div key={index} className="flex gap-2 items-center">
          <input
            type="text"
            value={ref}
            onChange={(e) => updateReference(index, e.target.value)}
            className="flex-1 px-3 py-2 border border-sky-200 rounded-lg focus:border-sky-400 focus:ring-2 focus:ring-sky-200 outline-none transition-colors text-slate-800 bg-white"
            placeholder={`Reference ${index + 1}`}
          />
          {referenceList.length > 1 && (
            <button
              type="button"
              onClick={() => removeReference(index)}
              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors duration-200"
              title="Remove reference"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={addReference}
        className="flex items-center gap-2 px-3 py-2 text-[#0ea5e9] hover:text-[#0284c7] hover:bg-sky-50 rounded-lg transition-colors duration-200 text-sm"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Reference
      </button>
    </div>
  );
}

function BulkQuestionManagerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastFetchedQuestionId = useRef<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [searchStatus, setSearchStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [searchMessage, setSearchMessage] = useState("");
  
  // State for user role
  const [userRole, setUserRole] = useState<"ADMIN" | "MASTER_ADMIN" | null>(null);
  
  // Fetch user role on component mount
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const response = await fetch('/api/me/role', { cache: 'no-store' });
        const data = await response.json();
        setUserRole(data?.role);
      } catch (error) {
        console.error('Error fetching user role:', error);
      }
    };
    fetchUserRole();
  }, []);
  
  const [state, setState] = useState<BulkUploadState>({
    status: 'idle',
    progress: 0,
    message: '',
    questions: [],
    editingIndex: null
  });

  const openQuestionForEditing = useCallback((question: ExtractedQuestion) => {
    const normalizedTags = normalizeTagValues(question.tags);
    const normalisedOccurrences = normalizeOccurrencesForState(question.occurrences);
    const normalisedQuestion: ExtractedQuestion = {
      ...question,
      tags: normalizedTags,
      occurrences: normalisedOccurrences,
    };

    setState(prev => {
      const existingIndex = prev.questions.findIndex((q) => q.id === normalisedQuestion.id);
      const nextQuestions = existingIndex > -1
        ? prev.questions.map((q, idx) => (idx === existingIndex ? normalisedQuestion : q))
        : [normalisedQuestion, ...prev.questions];
      const nextEditingIndex = existingIndex > -1 ? existingIndex : 0;
      const nextStatus = prev.status === 'idle' ? 'ready' : prev.status;
      return {
        ...prev,
        status: nextStatus,
        questions: nextQuestions,
        editingIndex: nextEditingIndex,
      };
    });
  }, []);

  const createEmptyQuestion = useCallback((): ExtractedQuestion => ({
    id: 'manual-' + Date.now().toString(),
    questionText: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    optionE: '',
    correctAnswer: '',
    explanation: '',
    educationalObjective: '',
    references: '',
    tags: [],
    rotation: '',
    system: '',
    discipline: '',
    resource: '',
    questionYear: '',
    rotationNumber: '',
    iduScreenshotUrl: '',
    questionImageUrl: '',
    explanationImageUrl: '',
    occurrences: [],
    source: 'manual',
    isAnswerConfirmed: true, // Default to confirmed for new questions
  }), []);

  const handleAddManualQuestion = useCallback(async () => {
    try {
      // Create a draft question in the database immediately so it has an ID
      const response = await fetch('/api/admin/questions/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        throw new Error('Failed to create draft question');
      }
      
      const data = await response.json();
      const draftQuestionId = data.questionId;
      
      // Create the question object with the draft ID
      const freshQuestion = {
        ...createEmptyQuestion(),
        dbId: draftQuestionId, // This is the key - it now has a database ID!
      };
      
      openQuestionForEditing(freshQuestion);
      setSearchStatus('idle');
      setSearchMessage('');
      lastFetchedQuestionId.current = null;
    } catch (error) {
      console.error('Error creating draft question:', error);
      // Fallback to old behavior if API fails
      const freshQuestion = createEmptyQuestion();
      openQuestionForEditing(freshQuestion);
    }
  }, [createEmptyQuestion, openQuestionForEditing]);

  const fetchExistingQuestion = useCallback(async (rawId: string) => {
    const trimmed = rawId.trim();
    if (!trimmed) {
      setSearchStatus('error');
      setSearchMessage('Enter a question ID to search.');
      return;
    }

    setSearchStatus('loading');
    setSearchMessage('Searching for question...');
    try {
      const response = await fetch(`/api/admin/questions/${trimmed}`);
      if (!response.ok) {
        let message = `Unable to find question ${trimmed}.`;
        try {
          const payload = await response.json();
          if (payload?.error) {
            message = payload.error;
          }
        } catch {
          // ignore JSON parse errors
        }
        setSearchStatus('error');
        setSearchMessage(message);
        return;
      }

      const data = await response.json();
      const tags = normalizeTagValues(
        Array.isArray(data?.tags)
          ? data.tags
              .map((tag: { type?: string | null; value?: string | null }) => {
                if (typeof tag === 'string') return tag;
                const category = tag?.type ? TAG_TYPE_TO_CATEGORY[String(tag.type).toUpperCase()] : undefined;
                const value = typeof tag?.value === 'string' ? tag.value.trim() : '';
                if (category && value) {
                  return `${category}:${value}`;
                }
                return null;
              })
              .filter((value: string | null): value is string => Boolean(value))
          : []
      );

      const rawOccurrences: RawOccurrenceInput[] = Array.isArray(data?.occurrences)
        ? (data.occurrences as Array<RawOccurrenceInput>).map((occ, index) => ({
            id: occ?.id,
            year: occ?.year ?? '',
            rotation: occ?.rotation ?? '',
            orderIndex:
              typeof occ?.orderIndex === 'number' && Number.isFinite(occ.orderIndex)
                ? occ.orderIndex
                : index,
            clientKey: occ?.clientKey ?? undefined,
          }))
        : [];

      if (rawOccurrences.length === 0) {
        const fallbackYear = typeof data?.questionYear === 'string' ? data.questionYear.trim() : '';
        const fallbackRotation = typeof data?.rotationNumber === 'string' ? data.rotationNumber.trim() : '';
        if (fallbackYear || fallbackRotation) {
          rawOccurrences.push({ year: fallbackYear, rotation: fallbackRotation, orderIndex: 0 });
        }
      }

      const occurrences = normalizeOccurrencesForState(rawOccurrences);

      const normalizedQuestion: ExtractedQuestion = {
        id: String(data?.id ?? trimmed),
        dbId: String(data?.id ?? trimmed),
        customId: data?.customId,
        questionText: data?.questionText ?? data?.text ?? '',
        optionA: data?.optionA ?? '',
        optionB: data?.optionB ?? '',
        optionC: data?.optionC ?? '',
        optionD: data?.optionD ?? '',
        optionE: data?.optionE ?? '',
        correctAnswer: (data?.correctAnswer ?? '').toString().trim().toUpperCase(),
        explanation: data?.explanation ?? '',
        educationalObjective: data?.educationalObjective ?? '',
        references: data?.references ?? '',
        tags,
        rotation: data?.rotation ?? '',
        system: data?.system ?? '',
        discipline: data?.discipline ?? '',
        resource: data?.resource ?? '',
        questionYear: data?.questionYear ?? '',
        rotationNumber: data?.rotationNumber ?? '',
        iduScreenshotUrl: data?.iduScreenshotUrl ?? '',
        questionImageUrl: data?.questionImageUrl ?? '',
        explanationImageUrl: data?.explanationImageUrl ?? '',
        occurrences,
        source: 'existing',
      };

      openQuestionForEditing(normalizedQuestion);
      lastFetchedQuestionId.current = trimmed;
      setSearchStatus('success');
      setSearchMessage(`Question ${trimmed} ready for editing.`);
    } catch (error) {
      console.error('Error fetching question:', error);
      setSearchStatus('error');
      setSearchMessage('Unexpected error fetching question. Please try again.');
    }
  }, [openQuestionForEditing]);

  const handleSearchExistingQuestion = useCallback(async () => {
    await fetchExistingQuestion(searchInput);
  }, [fetchExistingQuestion, searchInput]);

  const handleSearchInputKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSearchExistingQuestion();
    }
  }, [handleSearchExistingQuestion]);

  useEffect(() => {
    const paramId = searchParams?.get('questionId');
    if (paramId && paramId !== lastFetchedQuestionId.current) {
      setSearchInput(paramId);
      fetchExistingQuestion(paramId);
    }
  }, [fetchExistingQuestion, searchParams]);
  const handleFileUpload = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file only.');
      return;
    }

    setState(prev => ({
      ...prev,
      status: 'uploading',
      progress: 10,
      message: 'Uploading PDF file...'
    }));

    try {
      const formData = new FormData();
      formData.append('pdf', file);

      const response = await fetch('/api/admin/bulk-questions/extract', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload and extract questions');
      }

      setState(prev => ({
        ...prev,
        status: 'extracting',
        progress: 50,
        message: 'Extracting questions from PDF...'
      }));

      const result = await response.json();
      
      setState(prev => ({
        ...prev,
        status: 'ready',
        progress: 100,
        message: `Successfully extracted ${result.questions.length} questions`,
        questions: result.questions.map((q: ExtractedQuestion, index: number) => ({
          ...q,
          id: `temp-${index}`,
          references: '',
          tags: q.tags || [], // Ensure tags is always an array
        }))
      }));

    } catch (error) {
      console.error('Error processing PDF:', error);
      setState(prev => ({
        ...prev,
        status: 'idle',
        progress: 0,
        message: 'Error processing PDF. Please try again.',
        questions: []
      }));
    }
  }, []);

  const handleEditQuestion = (index: number) => {
    setState(prev => ({ ...prev, editingIndex: index }));
  };

  const handleSaveQuestion = useCallback(async (updatedQuestion: ExtractedQuestion, index: number) => {
    if (updatedQuestion.source === 'existing' && updatedQuestion.dbId) {
  const normalizedCorrect = (updatedQuestion.correctAnswer || '').trim().toUpperCase();
  const uniqueTags = normalizeTagValues(updatedQuestion.tags);
      const requiredCategories = ['rotation', 'resource', 'discipline', 'system'];
      const missing = requiredCategories.filter((category) => !uniqueTags.some((tag) => tag.startsWith(`${category}:`)));
      if (missing.length) {
        setSearchStatus('error');
        setSearchMessage(`Add tags for: ${missing.join(', ')}`);
        throw new Error('Missing required tags');
      }

      const normalizedDrafts = normalizeOccurrencesForEditing(updatedQuestion.occurrences);
      const sanitizedOccurrences = prepareOccurrencesForSave(normalizedDrafts);
      const primaryOccurrenceMeta = derivePrimaryOccurrenceMeta(normalizedDrafts);

      updatedQuestion = {
        ...updatedQuestion,
        occurrences: normalizedDrafts,
        questionYear: primaryOccurrenceMeta.questionYear,
        rotationNumber: primaryOccurrenceMeta.rotationNumber,
      };

      const payload = {
        questionText: updatedQuestion.questionText,
        optionA: updatedQuestion.optionA,
        optionB: updatedQuestion.optionB,
        optionC: updatedQuestion.optionC,
        optionD: updatedQuestion.optionD,
        optionE: updatedQuestion.optionE ?? '',
        correctAnswer: normalizedCorrect,
        explanation: updatedQuestion.explanation,
        educationalObjective: updatedQuestion.educationalObjective,
        references: updatedQuestion.references,
        tags: uniqueTags,
        questionYear: (updatedQuestion.questionYear ?? '').trim(),
        rotationNumber: (updatedQuestion.rotationNumber ?? '').trim(),
        iduScreenshotUrl: (updatedQuestion.iduScreenshotUrl ?? '').trim(),
        questionImageUrl: (updatedQuestion.questionImageUrl ?? '').trim(),
        explanationImageUrl: (updatedQuestion.explanationImageUrl ?? '').trim(),
        occurrences: sanitizedOccurrences,
        isAnswerConfirmed: updatedQuestion.isAnswerConfirmed !== false, // Default to true if undefined
      };

      const response = await fetch(`/api/admin/questions/${updatedQuestion.dbId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let message = 'Failed to update question.';
        try {
          const details = await response.json();
          if (details?.error) {
            message = details.error;
          }
        } catch {
          // ignore parse issues
        }
        throw new Error(message);
      }

      const displayId = updatedQuestion.customId ?? updatedQuestion.dbId;
      setSearchStatus('success');
      setSearchMessage(displayId ? `Question ${displayId} updated.` : 'Question updated.');
    }

    setState(prev => {
      if (index < 0 || index >= prev.questions.length) {
        return { ...prev, editingIndex: null };
      }

      const updatedQuestions = prev.questions.map((q, i) => (i === index ? updatedQuestion : q));
      return {
        ...prev,
        questions: updatedQuestions,
        editingIndex: null,
      };
    });
  }, [setSearchMessage, setSearchStatus]);

  const handleSaveAllQuestions = async () => {
    const requiredCategories = ['rotation', 'resource', 'discipline', 'system'];

    const normalisedQuestions = state.questions.map((question) => {
  const uniqueTags = normalizeTagValues(question.tags);
      const normalisedCorrect = (question.correctAnswer || '').trim().toUpperCase();
      
      // Build answers array in the format the API expects
      const answers = [
        { text: (question.optionA || '').trim(), isCorrect: normalisedCorrect === 'A' },
        { text: (question.optionB || '').trim(), isCorrect: normalisedCorrect === 'B' },
        { text: (question.optionC || '').trim(), isCorrect: normalisedCorrect === 'C' },
        { text: (question.optionD || '').trim(), isCorrect: normalisedCorrect === 'D' },
        { text: question.optionE?.trim() ?? '', isCorrect: normalisedCorrect === 'E' },
      ].filter(a => a.text.length > 0); // Remove empty options
      
      // Convert string tags to object format expected by API
      // Format: ["rotation:Y5R1", "resource:IDU"] -> [{type: "rotation", value: "Y5R1"}, {type: "resource", value: "IDU"}]
      const formattedTags = uniqueTags.map(tag => {
        const [category, value] = tag.split(':');
        return { type: category, value: value };
      }).filter(tag => tag.type && tag.value);
      
      return {
        text: question.questionText.trim(),
        explanation: (question.explanation || '').trim(),
        objective: (question.educationalObjective || '').trim(),
        answers,
        refs: (question.references || '').trim(),
        tags: formattedTags,
      };
    });

    const validationIssues: string[] = [];
    normalisedQuestions.forEach((question, index) => {
      const missing = requiredCategories.filter((category) =>
        !question.tags.some((tag) => tag.type === category)
      );
      if (missing.length) {
        validationIssues.push(`Question ${index + 1}: missing ${missing.join(', ')}`);
      }
      if (!question.answers.some(a => a.isCorrect)) {
        validationIssues.push(`Question ${index + 1}: must have at least one correct answer`);
      }
    });

    if (validationIssues.length) {
      setState(prev => ({
        ...prev,
        message: validationIssues.join(' | '),
      }));
      const formattedList = validationIssues.map((issue) => `- ${issue}`).join('\n');
      alert(`Please resolve the following issues before saving:
${formattedList}`);
      return;
    }

    setState(prev => ({
      ...prev,
      status: 'saving',
      progress: 0,
      message: 'Saving all questions to database...',
    }));

    try {
      const response = await fetch('/api/admin/questions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: normalisedQuestions }),
      });

      if (!response.ok) {
        throw new Error('Failed to save questions');
      }

      const result = await response.json();

      const feedback = result.errors?.length
        ? `${result.message} (check errors in the console for details)`
        : result.message ?? 'Questions saved';

      setState(prev => ({
        ...prev,
        status: 'idle',
        progress: 0,
        message: feedback,
        questions: result.errors?.length ? prev.questions : [],
      }));

      if (result.errors?.length) {
        console.warn('Bulk save reported issues:', result.errors);
      } else if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error saving questions:', error);
      setState(prev => ({
        ...prev,
        status: 'ready',
        progress: 0,
        message: 'Error saving questions. Please try again.',
      }));
    }
  };

  // Function to go back to appropriate admin page based on role
  const handleGoBack = () => {
    if (userRole === "MASTER_ADMIN") {
      router.push("/year4/master-admin");
    } else {
      router.push("/year4/admin");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        
        {/* Header with Back Button */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-[#0ea5e9]">Bulk Question Manager</h1>
            <p className="text-slate-600">
              Upload PDF files containing 90-100 questions to extract and manage them with references and tags.
            </p>
          </div>
          <button
            onClick={handleGoBack}
            className="flex items-center gap-2 px-6 py-3 bg-[#0ea5e9] text-white rounded-xl font-medium hover:bg-[#0284c7] transition-all duration-300 shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {userRole === "MASTER_ADMIN" ? "Back to Master Admin" : "Back to Admin"}
          </button>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-xl border border-sky-200 p-6 mb-8 shadow-lg">
          <h2 className="text-xl font-semibold text-[#0ea5e9] mb-4">Upload PDF</h2>
          
          <div className="space-y-4">
            <div className="border-2 border-dashed border-sky-300 rounded-lg p-8 text-center bg-sky-50/50">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                disabled={state.status === 'uploading' || state.status === 'extracting'}
                className="hidden"
                id="pdf-upload"
              />
              <label
                htmlFor="pdf-upload"
                className={`cursor-pointer inline-flex items-center gap-3 px-6 py-3 rounded-xl font-medium transition-all duration-300 btn-hover ${
                  state.status === 'uploading' || state.status === 'extracting'
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-[#0ea5e9] text-white hover:bg-[#0284c7]'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                {state.status === 'uploading' ? 'Uploading...' : 
                 state.status === 'extracting' ? 'Extracting...' : 'Upload PDF File'}
              </label>
            </div>

            {state.progress > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#0284c7]">{state.message}</span>
                  <span className="text-[#0ea5e9] font-medium">{state.progress}%</span>
                </div>
                <div className="w-full bg-sky-100 rounded-full h-2">
                  <div
                    className="bg-[#0ea5e9] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${state.progress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
          <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end">
            <button
              onClick={handleAddManualQuestion}
              className="inline-flex items-center justify-center px-6 py-3 bg-[#0ea5e9] text-white rounded-xl font-medium shadow-lg hover:bg-[#0284c7] transition-all duration-300"
            >
              Add Individual Question
            </button>
            <div className="flex-1">
              <label className="block text-sm font-medium text-[#0284c7] mb-2">
                Find Existing Question
              </label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={handleSearchInputKeyDown}
                  placeholder="Enter question ID"
                  className="flex-1 px-3 py-2 border border-sky-200 rounded-lg focus:border-sky-400 focus:ring-2 focus:ring-sky-200 outline-none transition-all text-slate-700 bg-white"
                />
                <button
                  onClick={handleSearchExistingQuestion}
                  disabled={searchStatus === 'loading' || !searchInput.trim()}
                  className="w-full sm:w-auto px-6 py-2 bg-[#0ea5e9] text-white rounded-lg font-medium hover:bg-[#0284c7] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {searchStatus === 'loading' ? 'Searching...' : 'Search'}
                </button>
              </div>
              {searchMessage && (
                <p
                  className={`mt-2 text-sm ${
                    searchStatus === 'error'
                      ? 'text-red-600'
                      : searchStatus === 'success'
                      ? 'text-emerald-600'
                      : 'text-[#0284c7]'
                  }`}
                >
                  {searchMessage}
                </p>
              )}
            </div>
          </div>
        </div>
        {/* Questions Table */}
        {state.questions.length > 0 && (
          <div className="bg-white rounded-xl border border-sky-200 shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-sky-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-[#0ea5e9]">
                Extracted Questions ({state.questions.length})
              </h2>
              <button
                onClick={handleSaveAllQuestions}
                disabled={state.status === 'saving'}
                className="px-6 py-2 bg-[#0ea5e9] text-white rounded-lg font-medium hover:bg-[#0284c7] transition-all duration-300 disabled:opacity-50"
              >
                {state.status === 'saving' ? 'Saving...' : 'Save All Questions'}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-sky-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[#0284c7]">#</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[#0284c7]">Question Preview</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[#0284c7]">Correct Answer</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[#0284c7]">References</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[#0284c7]">Tags</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[#0284c7]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {state.questions.map((question, index) => (
                    <tr key={question.id} className="border-b border-sky-100 hover:bg-sky-50 transition-colors duration-200">
                      <td className="px-4 py-3 text-sm font-medium text-[#0ea5e9]">{index + 1}</td>
                      <td className="px-4 py-3 text-sm text-slate-800 max-w-xs">
                        <div className="truncate" title={question.questionText}>
                          {question.questionText.substring(0, 100)}...
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-[#0ea5e9]">{question.correctAnswer}</td>
                      <td className="px-4 py-3 text-sm">
                        <input
                          type="text"
                          value={question.references}
                          onChange={(e) => {
                            const newQuestions = [...state.questions];
                            newQuestions[index].references = e.target.value;
                            setState(prev => ({ ...prev, questions: newQuestions }));
                          }}
                          placeholder="Enter references"
                          className="w-full px-2 py-1 text-xs border border-sky-200 rounded focus:border-sky-400 focus:ring-2 focus:ring-sky-200 outline-none transition-all text-slate-700 bg-white"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex flex-wrap gap-1">
                          {(() => {
                            const displayTags = (question.tags ?? [])
                              .map((tag) => tagLabelFromPair(tag))
                              .filter((label): label is string => Boolean(label));
                            if (!displayTags.length) {
                              return <span className="text-slate-500 text-xs">No tags</span>;
                            }
                            const shown = displayTags.slice(0, 2);
                            return (
                              <>
                                {shown.map((label) => (
                                  <span
                                    key={label}
                                    className="inline-block px-2 py-1 bg-sky-100 text-[#0284c7] rounded-full text-xs"
                                  >
                                    {label}
                                  </span>
                                ))}
                                {displayTags.length > shown.length ? (
                                  <span className="text-slate-500 text-xs">+{displayTags.length - shown.length} more</span>
                                ) : null}
                              </>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => handleEditQuestion(index)}
                          className="px-3 py-1 text-xs bg-[#0ea5e9] text-white rounded hover:bg-[#0284c7] transition-all duration-200"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {state.editingIndex !== null && (
          <QuestionEditModal
            question={state.questions[state.editingIndex]}
            questionIndex={state.editingIndex}
            onSave={handleSaveQuestion}
            onClose={() => setState(prev => ({ ...prev, editingIndex: null }))}
          />
        )}

      </div>
    </div>
  );
}

interface QuestionEditModalProps {
  question: ExtractedQuestion;
  questionIndex: number;
  onSave: (_question: ExtractedQuestion, _index: number) => Promise<void> | void;
  onClose: () => void;
}

function QuestionEditModal({ question, questionIndex, onSave, onClose }: QuestionEditModalProps) {
  const [editedQuestion, setEditedQuestion] = useState<ExtractedQuestion>(() => ({
    ...question,
    occurrences: normalizeOccurrencesForEditing(question.occurrences),
  }));
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const stableQuestionId = editedQuestion.dbId ? String(editedQuestion.dbId) : null;
  // Track if this is an unsaved draft - check for the specific draft marker text
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isDraft, _setIsDraft] = useState(() => question.questionText === '[Draft - Not yet saved]');
  const [hasBeenSaved, setHasBeenSaved] = useState(false);
  const screenshotInputRef = useRef<HTMLInputElement | null>(null);
  const [screenshotUploading, setScreenshotUploading] = useState(false);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);

  // Question Image Upload
  const questionImageInputRef = useRef<HTMLInputElement | null>(null);
  const [questionImageUploading, setQuestionImageUploading] = useState(false);
  const [questionImageError, setQuestionImageError] = useState<string | null>(null);

  // Explanation Image Upload
  const explanationImageInputRef = useRef<HTMLInputElement | null>(null);
  const [explanationImageUploading, setExplanationImageUploading] = useState(false);
  const [explanationImageError, setExplanationImageError] = useState<string | null>(null);
  const occurrences = Array.isArray(editedQuestion.occurrences) ? editedQuestion.occurrences : [];
  // Filter out Y4/Y5 internal categorization from display - year buttons already show this
  const displayOccurrences = occurrences.filter(occ => !occ?.year?.match(/^Y[45]$/i));

  useEffect(() => {
    setEditedQuestion({
      ...question,
      occurrences: normalizeOccurrencesForEditing(question.occurrences),
    });
  }, [question]);

  // AI tag detection has been removed - manual tag selection only
  useEffect(() => {
    // Clear AI suggestions since AI functionality is removed
    setAiSuggestions([]);
  }, []);

  // Cleanup: Delete draft question if modal is closed without saving
  useEffect(() => {
    return () => {
      // On unmount (modal close), delete draft if it wasn't saved
      if (isDraft && !hasBeenSaved && stableQuestionId) {
        // Fire and forget - delete the draft question
        fetch(`/api/admin/questions/draft?id=${stableQuestionId}`, {
          method: 'DELETE',
        }).catch((error) => {
          console.error('Failed to delete draft question:', error);
        });
      }
    };
  }, [isDraft, hasBeenSaved, stableQuestionId]);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const normalizedDrafts = normalizeOccurrencesForEditing(occurrences);
      const primaryMeta = derivePrimaryOccurrenceMeta(normalizedDrafts);

      const normalised = {
        ...editedQuestion,
        tags: normalizeTagValues(editedQuestion.tags),
        occurrences: normalizedDrafts,
        questionYear: primaryMeta.questionYear,
        rotationNumber: primaryMeta.rotationNumber,
      };
      await onSave(normalised, questionIndex);
      setHasBeenSaved(true); // Mark as saved so we don't delete it on close
      onClose();
    } catch (error) {
      console.error('Error saving question:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to save question.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = useCallback(async () => {
    // If it's a draft that hasn't been saved, delete it
    if (isDraft && !hasBeenSaved && stableQuestionId) {
      try {
        await fetch(`/api/admin/questions/draft?id=${stableQuestionId}`, {
          method: 'DELETE',
        });
      } catch (error) {
        console.error('Failed to delete draft question:', error);
      }
    }
    onClose();
  }, [isDraft, hasBeenSaved, stableQuestionId, onClose]);

  const handleAddOccurrence = useCallback(() => {
    setEditedQuestion((prev) => {
      const existing = Array.isArray(prev.occurrences) ? prev.occurrences : [];
      const nextDrafts = normalizeOccurrencesForEditing([
        ...existing,
        {
          id: undefined,
          clientKey: makeOccurrenceKey(),
          year: '',
          rotation: '',
          orderIndex: existing.length,
        },
      ]);
      const primaryMeta = derivePrimaryOccurrenceMeta(nextDrafts);
      return {
        ...prev,
        occurrences: nextDrafts,
        questionYear: primaryMeta.questionYear,
        rotationNumber: primaryMeta.rotationNumber,
      };
    });
  }, []);

  const handleOccurrenceChange = useCallback((index: number, field: 'year' | 'rotation', value: string) => {
    setEditedQuestion((prev) => {
      const existing = Array.isArray(prev.occurrences) ? [...prev.occurrences] : [];
      if (!existing[index]) return prev;
      existing[index] = {
        ...existing[index],
        [field]: value,
      };
      const reindexed = normalizeOccurrencesForEditing(existing);
      const primaryMeta = derivePrimaryOccurrenceMeta(reindexed);
      return {
        ...prev,
        occurrences: reindexed,
        questionYear: primaryMeta.questionYear,
        rotationNumber: primaryMeta.rotationNumber,
      };
    });
  }, []);

  const handleRemoveOccurrence = useCallback((index: number) => {
    setEditedQuestion((prev) => {
      const existing = Array.isArray(prev.occurrences) ? [...prev.occurrences] : [];
      if (!existing[index]) return prev;
      existing.splice(index, 1);
      const reindexed = normalizeOccurrencesForEditing(existing);
      const primaryMeta = derivePrimaryOccurrenceMeta(reindexed);
      return {
        ...prev,
        occurrences: reindexed,
        questionYear: primaryMeta.questionYear,
        rotationNumber: primaryMeta.rotationNumber,
      };
    });
  }, []);

  const handleScreenshotUpload = useCallback(async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setScreenshotError('Please upload an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setScreenshotError('Image is too large (5 MB max).');
      return;
    }

    setScreenshotUploading(true);
    setScreenshotError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('kind', 'idu');
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload?.error ?? 'Failed to upload screenshot');
      }
      const payload = (await res.json().catch(() => ({}))) as { url?: string };
      if (!payload?.url) throw new Error('Upload did not return a URL');
      setEditedQuestion((prev) => ({ ...prev, iduScreenshotUrl: payload.url }));
    } catch (error) {
      setScreenshotError(error instanceof Error ? error.message : 'Failed to upload screenshot');
    } finally {
      setScreenshotUploading(false);
    }
  }, []);

  const handleScreenshotInputChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;
      await handleScreenshotUpload(file);
    },
    [handleScreenshotUpload]
  );

  const handleScreenshotDrop = useCallback(
    async (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const file = event.dataTransfer.files?.[0];
      if (!file) return;
      await handleScreenshotUpload(file);
    },
    [handleScreenshotUpload]
  );

  // Question Image Upload Handlers
  const handleQuestionImageUpload = useCallback(async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setQuestionImageError('Please upload an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setQuestionImageError('Image is too large (5 MB max).');
      return;
    }

    setQuestionImageUploading(true);
    setQuestionImageError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('kind', 'question');
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload?.error ?? 'Failed to upload question image');
      }
      const payload = (await res.json().catch(() => ({}))) as { url?: string };
      if (!payload?.url) throw new Error('Upload did not return a URL');
      setEditedQuestion((prev) => ({ ...prev, questionImageUrl: payload.url }));
    } catch (error) {
      setQuestionImageError(error instanceof Error ? error.message : 'Failed to upload question image');
    } finally {
      setQuestionImageUploading(false);
    }
  }, []);

  const handleQuestionImageInputChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;
      await handleQuestionImageUpload(file);
    },
    [handleQuestionImageUpload]
  );

  const handleQuestionImageDrop = useCallback(
    async (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const file = event.dataTransfer.files?.[0];
      if (!file) return;
      await handleQuestionImageUpload(file);
    },
    [handleQuestionImageUpload]
  );

  // Explanation Image Upload Handlers
  const handleExplanationImageUpload = useCallback(async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setExplanationImageError('Please upload an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setExplanationImageError('Image is too large (5 MB max).');
      return;
    }

    setExplanationImageUploading(true);
    setExplanationImageError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('kind', 'explanation');
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload?.error ?? 'Failed to upload explanation image');
      }
      const payload = (await res.json().catch(() => ({}))) as { url?: string };
      if (!payload?.url) throw new Error('Upload did not return a URL');
      setEditedQuestion((prev) => ({ ...prev, explanationImageUrl: payload.url }));
    } catch (error) {
      setExplanationImageError(error instanceof Error ? error.message : 'Failed to upload explanation image');
    } finally {
      setExplanationImageUploading(false);
    }
  }, []);

  const handleExplanationImageInputChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;
      await handleExplanationImageUpload(file);
    },
    [handleExplanationImageUpload]
  );

  const handleExplanationImageDrop = useCallback(
    async (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const file = event.dataTransfer.files?.[0];
      if (!file) return;
      await handleExplanationImageUpload(file);
    },
    [handleExplanationImageUpload]
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-sky-200 flex justify-between items-center z-20">
          <h2 className="text-xl font-semibold text-[#0ea5e9]">Edit Question</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 icon-hover"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6" style={{ paddingTop: '1.5rem' }}>{/* Added padding to prevent text clipping */}
          {/* Year Selector - MUST BE FIRST */}
          <div className="rounded-2xl border-2 border-[#0ea5e9] bg-sky-50 p-4">
            <label className="block text-sm font-semibold text-[#0284c7] mb-3 uppercase tracking-wide">Question Year</label>
            <p className="text-xs text-slate-600 mb-3">Select which year this question belongs to. This determines where the question appears.</p>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => {
                  setEditedQuestion((prev) => {
                    const existing = Array.isArray(prev.occurrences) ? [...prev.occurrences] : [];
                    const withoutY5 = existing.filter((occ) => occ.year !== 'Y5');
                    const hasY4 = withoutY5.some((occ) => occ.year === 'Y4');
                    if (!hasY4) {
                      withoutY5.push({ clientKey: makeOccurrenceKey(), year: 'Y4', rotation: '', orderIndex: withoutY5.length });
                    }
                    const reindexed = normalizeOccurrencesForEditing(withoutY5);
                    const primaryMeta = derivePrimaryOccurrenceMeta(reindexed);
                    return { ...prev, occurrences: reindexed, questionYear: primaryMeta.questionYear, rotationNumber: primaryMeta.rotationNumber };
                  });
                }}
                className={`flex-1 px-4 py-3 rounded-lg border-2 font-semibold transition-all duration-200 ${
                  (Array.isArray(editedQuestion.occurrences) ? editedQuestion.occurrences : []).some((occ) => occ.year === 'Y4')
                    ? 'border-[#0ea5e9] bg-[#0ea5e9] text-white shadow-lg'
                    : 'border-sky-200 bg-white text-[#0284c7] hover:border-[#0ea5e9] hover:bg-sky-50'
                }`}
              >
                Year 4
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditedQuestion((prev) => {
                    const existing = Array.isArray(prev.occurrences) ? [...prev.occurrences] : [];
                    const withoutY4 = existing.filter((occ) => occ.year !== 'Y4');
                    const hasY5 = withoutY4.some((occ) => occ.year === 'Y5');
                    if (!hasY5) {
                      withoutY4.push({ clientKey: makeOccurrenceKey(), year: 'Y5', rotation: '', orderIndex: withoutY4.length });
                    }
                    const reindexed = normalizeOccurrencesForEditing(withoutY4);
                    const primaryMeta = derivePrimaryOccurrenceMeta(reindexed);
                    return { ...prev, occurrences: reindexed, questionYear: primaryMeta.questionYear, rotationNumber: primaryMeta.rotationNumber };
                  });
                }}
                className={`flex-1 px-4 py-3 rounded-lg border-2 font-semibold transition-all duration-200 ${
                  (Array.isArray(editedQuestion.occurrences) ? editedQuestion.occurrences : []).some((occ) => occ.year === 'Y5')
                    ? 'border-[#0ea5e9] bg-[#0ea5e9] text-white shadow-lg'
                    : 'border-sky-200 bg-white text-[#0284c7] hover:border-[#0ea5e9] hover:bg-sky-50'
                }`}
              >
                Year 5
              </button>
            </div>
          </div>

          {/* Question Text with Rich Text Editor */}
          <div>
            <label className="block text-sm font-medium text-[#0284c7] mb-2">Question Text</label>
            <div className="border border-sky-200 rounded-lg">
              <RichTextEditor
                content={editedQuestion.questionText}
                onChange={(content) => setEditedQuestion(prev => ({ ...prev, questionText: content }))}
                placeholder="Enter the question text..."
                className="min-h-[150px]"
                allowBold={false} // Don't allow bold in question text
                preserveLineBreaks={true}
              />
            </div>
          </div>

          {/* Question Image Upload */}
          <div className="rounded-2xl border border-sky-200 bg-white p-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-[#0ea5e9] uppercase tracking-wide">Question Image</label>
              <p className="text-xs text-slate-500">
                Upload an image to display below the question stem. Accepted formats: PNG, JPG, GIF (max 5&nbsp;MB).
              </p>
            </div>
            <input
              ref={questionImageInputRef}
              type="file"
              accept="image/*"
              onChange={handleQuestionImageInputChange}
              className="hidden"
            />
            <div
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'copy';
              }}
              onDrop={handleQuestionImageDrop}
              className="mt-3 flex min-h-[120px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-sky-200 bg-white px-4 py-6 text-center transition hover:border-[#0ea5e9] hover:bg-sky-50"
            >
              <button
                type="button"
                onClick={() => questionImageInputRef.current?.click()}
                className="rounded-lg border border-[#0ea5e9] px-4 py-1.5 text-sm font-semibold text-[#0ea5e9] transition hover:bg-sky-50"
              >
                {questionImageUploading ? 'Uploading…' : 'Select image'}
              </button>
              <span className="text-xs text-slate-500">or drag &amp; drop</span>
              {questionImageError ? (
                <span className="text-xs text-red-600">{questionImageError}</span>
              ) : null}
            </div>

            {editedQuestion.questionImageUrl ? (
              <div className="mt-4 rounded-xl border border-sky-200 bg-white p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#0ea5e9]">Current question image</p>
                    <a
                      href={editedQuestion.questionImageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#2F6F8F] underline"
                    >
                      Open in new tab
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditedQuestion((prev) => ({ ...prev, questionImageUrl: '' }))}
                    className="text-xs font-semibold text-[#e11d48] underline underline-offset-2 hover:text-[#be123c]"
                  >
                    Remove image
                  </button>
                </div>
                <div className="mt-3 overflow-hidden rounded-lg border border-[#E6F0F7] bg-[#F9FCFF]">
                  <Image
                    src={editedQuestion.questionImageUrl}
                    alt="Question image preview"
                    width={1024}
                    height={768}
                    className="max-h-64 w-full object-contain"
                    unoptimized
                  />
                </div>
              </div>
            ) : null}
          </div>

          {/* Options with Rich Text Editors */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {['A', 'B', 'C', 'D', 'E'].map((option) => (
              <div key={option}>
                <label className="block text-sm font-medium text-[#0284c7] mb-2">Option {option}</label>
                <textarea
                  value={editedQuestion[`option${option}` as keyof ExtractedQuestion] as string || ''}
                  onChange={(e) => setEditedQuestion(prev => ({ 
                    ...prev, 
                    [`option${option}`]: e.target.value 
                  }))}
                  placeholder={`Enter option ${option}...`}
                  className="w-full min-h-[80px] px-3 py-2 border border-sky-200 rounded-lg focus:border-sky-400 focus:ring-2 focus:ring-sky-200 outline-none resize-vertical"
                  rows={3}
                />
              </div>
            ))}
          </div>

          {/* Correct Answer */}
          <div>
            <label className="block text-sm font-medium text-[#0284c7] mb-2">Correct Answer</label>
            <select
              value={editedQuestion.correctAnswer}
              onChange={(e) => setEditedQuestion(prev => ({ ...prev, correctAnswer: e.target.value }))}
              className="w-full px-3 py-2 border border-sky-200 rounded-lg focus:border-sky-400 focus:ring-2 focus:ring-sky-200 outline-none"
            >
              <option value="">Select correct answer</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
              <option value="D">D</option>
              <option value="E">E</option>
            </select>
          </div>

          {/* Explanation with Rich Text Editor */}
          <div>
            <label className="block text-sm font-medium text-[#0284c7] mb-2">Explanation (Expandable - No character limit)</label>
            <div className="border border-sky-200 rounded-lg">
              <RichTextEditor
                content={editedQuestion.explanation}
                onChange={(content) => setEditedQuestion(prev => ({ ...prev, explanation: content }))}
                placeholder="Enter the explanation... This field expands as you type with no character limit."
                className="min-h-[200px]"
                allowBold={true} // Allow bold in explanations
                preserveLineBreaks={true}
              />
            </div>
          </div>

          {/* Explanation Image Upload */}
          <div className="rounded-2xl border border-sky-200 bg-white p-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-[#0ea5e9] uppercase tracking-wide">Explanation Image</label>
              <p className="text-xs text-slate-500">
                Upload an image to display above the explanation text. Accepted formats: PNG, JPG, GIF (max 5&nbsp;MB).
              </p>
            </div>
            <input
              ref={explanationImageInputRef}
              type="file"
              accept="image/*"
              onChange={handleExplanationImageInputChange}
              className="hidden"
            />
            <div
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'copy';
              }}
              onDrop={handleExplanationImageDrop}
              className="mt-3 flex min-h-[120px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-sky-200 bg-white px-4 py-6 text-center transition hover:border-[#0ea5e9] hover:bg-sky-50"
            >
              <button
                type="button"
                onClick={() => explanationImageInputRef.current?.click()}
                className="rounded-lg border border-[#0ea5e9] px-4 py-1.5 text-sm font-semibold text-[#0ea5e9] transition hover:bg-sky-50"
              >
                {explanationImageUploading ? 'Uploading…' : 'Select image'}
              </button>
              <span className="text-xs text-slate-500">or drag &amp; drop</span>
              {explanationImageError ? (
                <span className="text-xs text-red-600">{explanationImageError}</span>
              ) : null}
            </div>

            {editedQuestion.explanationImageUrl ? (
              <div className="mt-4 rounded-xl border border-[#E6F0F7] bg-white p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#2F6F8F]">Current explanation image</p>
                    <a
                      href={editedQuestion.explanationImageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#2F6F8F] underline"
                    >
                      Open in new tab
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditedQuestion((prev) => ({ ...prev, explanationImageUrl: '' }))}
                    className="text-xs font-semibold text-[#e11d48] underline underline-offset-2 hover:text-[#be123c]"
                  >
                    Remove image
                  </button>
                </div>
                <div className="mt-3 overflow-hidden rounded-lg border border-[#E6F0F7] bg-[#F9FCFF]">
                  <Image
                    src={editedQuestion.explanationImageUrl}
                    alt="Explanation image preview"
                    width={1024}
                    height={768}
                    className="max-h-64 w-full object-contain"
                    unoptimized
                  />
                </div>
              </div>
            ) : null}
          </div>

          {/* Educational Objective with Rich Text Editor */}
          <div>
            <label className="block text-sm font-medium text-[#0284c7] mb-2">Educational Objective</label>
            <div className="border border-sky-200 rounded-lg">
              <RichTextEditor
                content={editedQuestion.educationalObjective}
                onChange={(content) => setEditedQuestion(prev => ({ ...prev, educationalObjective: content }))}
                placeholder="Enter the educational objective..."
                className="min-h-[100px]"
                allowBold={true} // Allow bold in educational objectives
                preserveLineBreaks={true}
              />
            </div>
          </div>

          {/* References */}
          <div>
            <label className="block text-sm font-medium text-[#0284c7] mb-2">References</label>
            <MultipleReferencesEditor 
              references={editedQuestion.references}
              onChange={(newRefs) => setEditedQuestion(prev => ({ ...prev, references: newRefs }))}
            />
          </div>

          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#0284c7] uppercase tracking-wide">Question Appearances</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Track every year and rotation combination where this question appeared so we can surface its history to students.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddOccurrence}
                className="inline-flex items-center gap-2 rounded-lg border border-[#0ea5e9] px-3 py-1.5 text-xs font-semibold text-[#0ea5e9] transition hover:bg-sky-100"
              >
                <span className="text-lg leading-none">＋</span>
                Add occurrence
              </button>
            </div>

            <div className="space-y-3">
              {displayOccurrences.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#C7D9E6] bg-white px-3 py-4 text-sm text-slate-500">
                  No appearances recorded yet. Add the first year and rotation where this question was used.
                </div>
              ) : (
                displayOccurrences.map((occurrence) => {
                  // Find the actual index in the full occurrences array for proper handler calls
                  const actualIndex = occurrences.findIndex(occ => occ === occurrence);
                  return (
                    <div
                      key={occurrence.clientKey ?? occurrence.id ?? `${actualIndex}-${occurrence.year}-${occurrence.rotation}`}
                      className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
                    >
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Year</label>
                        <input
                          type="text"
                          value={occurrence.year ?? ''}
                          onChange={(e) => handleOccurrenceChange(actualIndex, 'year', e.target.value)}
                          placeholder="e.g. 2025"
                          className="mt-1 w-full rounded-lg border border-[#E6F0F7] px-3 py-2 text-sm focus:border-[#56A2CD] focus:ring-2 focus:ring-[#56A2CD] outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Rotation</label>
                        <input
                          type="text"
                          value={occurrence.rotation ?? ''}
                          onChange={(e) => handleOccurrenceChange(actualIndex, 'rotation', e.target.value)}
                          placeholder="e.g. Rotation 3"
                          className="mt-1 w-full rounded-lg border border-[#E6F0F7] px-3 py-2 text-sm focus:border-[#56A2CD] focus:ring-2 focus:ring-[#56A2CD] outline-none"
                        />
                      </div>
                      <div className="flex items-end justify-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveOccurrence(actualIndex)}
                          className="text-xs font-semibold text-[#e11d48] underline underline-offset-2 hover:text-[#be123c]"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-sky-200 bg-white p-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-[#0ea5e9] uppercase tracking-wide">IDU Screenshot</label>
              <p className="text-xs text-slate-500">
                Drop an image or upload a new screenshot of the question. Accepted formats: PNG, JPG, GIF (max 5&nbsp;MB).
              </p>
            </div>
            <input
              ref={screenshotInputRef}
              type="file"
              accept="image/*"
              onChange={handleScreenshotInputChange}
              className="hidden"
            />
            <div
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'copy';
              }}
              onDrop={handleScreenshotDrop}
              className="mt-3 flex min-h-[120px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[#C7D9E6] bg-white px-4 py-6 text-center transition hover:border-[#56A2CD] hover:bg-[#F8FCFF]"
            >
              <button
                type="button"
                onClick={() => screenshotInputRef.current?.click()}
                className="rounded-lg border border-[#0ea5e9] px-4 py-1.5 text-sm font-semibold text-[#0ea5e9] transition hover:bg-sky-50"
              >
                {screenshotUploading ? 'Uploading…' : 'Select image'}
              </button>
              <span className="text-xs text-slate-500">or drag &amp; drop</span>
              {screenshotError ? (
                <span className="text-xs text-red-600">{screenshotError}</span>
              ) : null}
            </div>

            {editedQuestion.iduScreenshotUrl ? (
              <div className="mt-4 rounded-xl border border-[#E6F0F7] bg-white p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#2F6F8F]">Current screenshot</p>
                    <a
                      href={editedQuestion.iduScreenshotUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#2F6F8F] underline"
                    >
                      Open in new tab
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditedQuestion((prev) => ({ ...prev, iduScreenshotUrl: '' }))}
                    className="text-xs font-semibold text-[#e11d48] underline underline-offset-2 hover:text-[#be123c]"
                  >
                    Remove screenshot
                  </button>
                </div>
                <div className="mt-3 overflow-hidden rounded-lg border border-[#E6F0F7] bg-[#F9FCFF]">
                  <Image
                    src={editedQuestion.iduScreenshotUrl}
                    alt="IDU screenshot preview"
                    width={1024}
                    height={768}
                    className="max-h-64 w-full object-contain"
                    unoptimized
                  />
                </div>
              </div>
            ) : null}
          </div>

          {/* Answer Confirmation Status */}
          <div className="rounded-2xl border border-sky-200 bg-white p-4">
            <div className="flex flex-col gap-2 mb-3">
              <label className="text-sm font-semibold text-[#0ea5e9] uppercase tracking-wide">IDU Answer Confirmation Status</label>
              <p className="text-xs text-slate-500">
                Mark whether the answer from the IDU screenshot has been verified and confirmed.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditedQuestion(prev => ({ ...prev, isAnswerConfirmed: true }))}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  editedQuestion.isAnswerConfirmed !== false
                    ? 'bg-green-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                ✓ Confirmed
              </button>
              <button
                type="button"
                onClick={() => setEditedQuestion(prev => ({ ...prev, isAnswerConfirmed: false }))}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  editedQuestion.isAnswerConfirmed === false
                    ? 'bg-red-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                ⚠ Unconfirmed
              </button>
            </div>
          </div>

          {/* Tags with Tag Selector and AI Suggestions */}
          <TagSelector
            selectedTags={editedQuestion.tags}
            onChange={(tags) =>
              setEditedQuestion(prev => ({
                ...prev,
                tags: normalizeTagValues(tags),
              }))
            }
            className="border border-[#E6F0F7] rounded-lg p-4"
            aiSuggestions={aiSuggestions}
            year={editedQuestion.questionYear === "Y4" ? "Y4" : "Y5"}
          />

          {/* Question Discussion Section - Always visible */}
          <div className="rounded-2xl border border-sky-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-[#0ea5e9] uppercase tracking-wide mb-3">Question Discussion</h3>
            <p className="text-xs text-slate-500 mb-4">
              Add comments from previous batches to help students understand common mistakes and important points.
            </p>
            {stableQuestionId ? (
              <AdminQuestionComments key={stableQuestionId} questionId={stableQuestionId} />
            ) : (
              <div className="rounded-lg border-2 border-dashed border-sky-200 bg-sky-50 p-6 text-center">
                <svg className="w-12 h-12 mx-auto text-sky-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <p className="text-sm font-medium text-[#0284c7] mb-1">Save question first to add comments</p>
                <p className="text-xs text-slate-500">
                  Comments from previous batches can be added after you save this question to the database.
                </p>
              </div>
            )}
          </div>

          {saveError && (
            <p className="text-sm text-red-600">{saveError}</p>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 pt-4 border-t border-sky-200">
            <button
              onClick={handleClose}
              className="px-6 py-2 border border-sky-200 text-[#0284c7] rounded-lg hover:bg-sky-50 transition-colors duration-200 btn-hover"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-[#0ea5e9] text-white rounded-lg hover:bg-[#0284c7] transition-all duration-300 btn-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
export default function BulkQuestionManager() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-[#0ea5e9]">Loading...</div>}>
      <BulkQuestionManagerContent />
    </Suspense>
  );
}


