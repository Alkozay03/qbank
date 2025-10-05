"use client";

import { useState } from "react";

interface Answer {
  text: string;
  isCorrect: boolean;
}

interface Tag {
  type: "SUBJECT" | "SYSTEM" | "TOPIC" | "ROTATION" | "RESOURCE" | "MODE";
  value: string;
}

interface QuestionEditorProps {
  initialQuestion?: string;
  initialExplanation?: string;
  initialObjective?: string;
  initialAnswers?: Answer[];
  initialTags?: Tag[];
  onSave: (_data: {
    question: string;
    explanation: string;
    objective: string;
    answers: Answer[];
    tags: Tag[];
  }) => void;
  onCancel: () => void;
}

const rotations = ["Internal Medicine", "General Surgery", "Pediatrics", "Obstetrics and Gynaecology"] as const;
const resources = ["UWorld - Step 1", "UWorld - Step 2", "Amboss", "Boards & beyond", "Previouses"] as const;
const systems = [
  "Biochemistry (General Principles)", "Genetics (General Principles)", "Microbiology (General Principles)",
  "Pathology (General Principles)", "Pharmacology (General Principles)", "Biostatistics & Epidemiology",
  "Poisoning & Environmental Exposure", "Psychiatric/Behavioral & Substance Use Disorder",
  "Social Sciences (Ethics/Legal/Professional)", "Miscellaneous (Multisystem)", "Allergy & Immunology",
  "Cardiovascular System", "Dermatology", "Ear, Nose & Throat (ENT)", "Endocrine, Diabetes & Metabolism",
  "Female Reproductive System & Breast", "Gastrointestinal & Nutrition", "Hematology & Oncology",
  "Infectious Diseases", "Male Reproductive System", "Nervous System", "Ophthalmology",
  "Pregnancy, Childbirth & Puerperium", "Pulmonary & Critical Care", "Renal, Urinary Systems & Electrolytes",
  "Rheumatology/Orthopedics & Sports"
] as const;
const subjects = [
  "Anatomy", "Behavioral science", "Biochemistry", "Biostatistics", "Embryology",
  "Genetics", "Histology", "Immunology", "Microbiology", "Pathology",
  "Pathophysiology", "Pharmacology", "Physiology"
] as const;

export default function QuestionEditor({
  initialQuestion = "",
  initialExplanation = "",
  initialObjective = "",
  initialAnswers = [
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false }
  ],
  initialTags = [],
  onSave,
  onCancel
}: QuestionEditorProps) {
  const [question, setQuestion] = useState(initialQuestion);
  const [explanation, setExplanation] = useState(initialExplanation);
  const [objective, setObjective] = useState(initialObjective);
  const [answers, setAnswers] = useState<Answer[]>(initialAnswers);
  const [tags, setTags] = useState<Tag[]>(initialTags);

  const addAnswer = () => {
    setAnswers([...answers, { text: "", isCorrect: false }]);
  };

  const removeAnswer = (index: number) => {
    setAnswers(answers.filter((_, i) => i !== index));
  };

  const updateAnswer = (index: number, field: keyof Answer, value: string | boolean) => {
    const newAnswers = [...answers];
    newAnswers[index] = { ...newAnswers[index], [field]: value };
    setAnswers(newAnswers);
  };

  const addTag = (type: Tag["type"], value: string) => {
    if (!value.trim()) return;
    const newTag: Tag = { type, value: value.trim() };
    if (!tags.some(tag => tag.type === type && tag.value === value)) {
      setTags([...tags, newTag]);
    }
  };

  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!question.trim()) {
      alert("Question text is required");
      return;
    }

    const validAnswers = answers.filter(a => a.text.trim());
    if (validAnswers.length === 0) {
      alert("At least one answer is required");
      return;
    }

    const correctAnswers = validAnswers.filter(a => a.isCorrect);
    if (correctAnswers.length === 0) {
      alert("At least one correct answer is required");
      return;
    }

    onSave({
      question: question.trim(),
      explanation: explanation.trim(),
      objective: objective.trim(),
      answers: validAnswers,
      tags
    });
  };

  return (
    <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">Edit Question</h2>
      </div>

      <div className="px-6 py-4 space-y-6">
        {/* Question Text */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Question Text *
          </label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={4}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter the question text..."
          />
        </div>

        {/* Explanation */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Explanation
          </label>
          <textarea
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter the explanation..."
          />
        </div>

        {/* Objective */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Learning Objective
          </label>
          <input
            type="text"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter the learning objective..."
          />
        </div>

        {/* Answers */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Answers *
            </label>
            <button
              onClick={addAnswer}
              className="text-sm bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700"
            >
              Add Answer
            </button>
          </div>

          <div className="space-y-3">
            {answers.map((answer, index) => (
              <div key={index} className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={answer.isCorrect}
                  onChange={(e) => updateAnswer(index, 'isCorrect', e.target.checked)}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <input
                  type="text"
                  value={answer.text}
                  onChange={(e) => updateAnswer(index, 'text', e.target.value)}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={`Answer ${index + 1}`}
                />
                {answers.length > 2 && (
                  <button
                    onClick={() => removeAnswer(index)}
                    className="text-red-600 hover:text-red-800 p-1"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tags
          </label>

          {/* Current Tags */}
          {tags.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-theme-secondary text-primary"
                >
                  {tag.type}: {tag.value}
                  <button
                    onClick={() => removeTag(index)}
                    className="ml-1 text-primary hover:text-primary-hover"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Add Tag Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <select
                id="subject-select"
                onChange={(e) => {
                  if (e.target.value) {
                    addTag("SUBJECT", e.target.value);
                    e.target.value = "";
                  }
                }}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Add Subject...</option>
                {subjects.map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>

            <div>
              <select
                id="system-select"
                onChange={(e) => {
                  if (e.target.value) {
                    addTag("SYSTEM", e.target.value);
                    e.target.value = "";
                  }
                }}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Add System...</option>
                {systems.map(system => (
                  <option key={system} value={system}>{system}</option>
                ))}
              </select>
            </div>

            <div>
              <select
                id="rotation-select"
                onChange={(e) => {
                  if (e.target.value) {
                    addTag("ROTATION", e.target.value);
                    e.target.value = "";
                  }
                }}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Add Rotation...</option>
                {rotations.map(rotation => (
                  <option key={rotation} value={rotation}>{rotation}</option>
                ))}
              </select>
            </div>

            <div>
              <select
                id="resource-select"
                onChange={(e) => {
                  if (e.target.value) {
                    addTag("RESOURCE", e.target.value);
                    e.target.value = "";
                  }
                }}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Add Resource...</option>
                {resources.map(resource => (
                  <option key={resource} value={resource}>{resource}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-primary text-inverse rounded-md hover:bg-primary-hover"
        >
          Save Question
        </button>
      </div>
    </div>
  );
}
