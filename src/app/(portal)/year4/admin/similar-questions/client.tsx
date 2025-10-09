"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, Check, Trash2, AlertTriangle } from "lucide-react";

type Answer = {
  id: string;
  text: string;
  isCorrect: boolean;
};

type Tag = {
  tag: {
    type: string;
    value: string;
  };
};

type Question = {
  id: string;
  customId: number | null;
  text: string | null;
  explanation: string | null;
  objective: string | null;
  references: string | null;
  createdAt: Date;
  answers: Answer[];
  questionTags: Tag[];
};

type SimilarGroup = {
  id: string;
  createdAt: Date;
  similarityScores: Record<string, number>;
  questions: Question[];
};

type Props = {
  groups: SimilarGroup[];
  yearContext: "year4" | "year5";
};

export default function SimilarQuestionsClient({ groups: initialGroups, yearContext }: Props) {
  const [groups, setGroups] = useState(initialGroups);
  const [selectedGroup, setSelectedGroup] = useState<SimilarGroup | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleViewGroup = (group: SimilarGroup) => {
    setSelectedGroup(group);
    setIsModalOpen(true);
  };

  const handleKeepQuestion = async (questionId: string) => {
    if (!confirm("Are you sure you want to keep this question? It will be removed from this alert.")) {
      return;
    }

    setActionLoading(questionId);
    try {
      const response = await fetch(`/api/admin/similar-questions/keep`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId }),
      });

      if (!response.ok) {
        throw new Error("Failed to keep question");
      }

      // Remove question from groups
      setGroups((prevGroups) =>
        prevGroups
          .map((group) => ({
            ...group,
            questions: group.questions.filter((q) => q.id !== questionId),
          }))
          .filter((group) => group.questions.length > 1) // Remove groups with < 2 questions
      );

      // Close modal if current group is now empty
      if (selectedGroup) {
        const updatedQuestions = selectedGroup.questions.filter((q) => q.id !== questionId);
        if (updatedQuestions.length <= 1) {
          setIsModalOpen(false);
          setSelectedGroup(null);
        } else {
          setSelectedGroup({
            ...selectedGroup,
            questions: updatedQuestions,
          });
        }
      }

      alert("Question kept successfully");
    } catch (error) {
      console.error(error);
      alert("Failed to keep question");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteQuestion = async (questionId: string, customId: number | null) => {
    if (
      !confirm(
        `Are you sure you want to DELETE question ${customId ?? questionId}? This action cannot be undone!`
      )
    ) {
      return;
    }

    setActionLoading(questionId);
    try {
      const response = await fetch(`/api/admin/similar-questions/delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete question");
      }

      // Remove question from groups
      setGroups((prevGroups) =>
        prevGroups
          .map((group) => ({
            ...group,
            questions: group.questions.filter((q) => q.id !== questionId),
          }))
          .filter((group) => group.questions.length > 1)
      );

      // Close modal if current group is now empty
      if (selectedGroup) {
        const updatedQuestions = selectedGroup.questions.filter((q) => q.id !== questionId);
        if (updatedQuestions.length <= 1) {
          setIsModalOpen(false);
          setSelectedGroup(null);
        } else {
          setSelectedGroup({
            ...selectedGroup,
            questions: updatedQuestions,
          });
        }
      }

      alert("Question deleted successfully");
    } catch (error) {
      console.error(error);
      alert("Failed to delete question");
    } finally {
      setActionLoading(null);
    }
  };

  const getSimilarityScore = (group: SimilarGroup, q1Id: string, q2Id: string): number => {
    const key1 = `${q1Id}-${q2Id}`;
    const key2 = `${q2Id}-${q1Id}`;
    return group.similarityScores[key1] ?? group.similarityScores[key2] ?? 0;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-50">
      <div className="mx-auto max-w-7xl px-3 sm:px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link
            href={`/${yearContext}/admin`}
            className="p-2 hover:bg-white rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-[#0ea5e9] flex items-center gap-2">
              <AlertTriangle className="h-8 w-8 text-amber-500" />
              Similar Questions Alert
            </h1>
            <p className="mt-1 text-slate-600">
              Review and manage questions with high similarity (≥50%)
            </p>
          </div>
        </div>

        {groups.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg border border-sky-200 p-12 text-center">
            <AlertTriangle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-slate-800 mb-2">
              No Similar Questions Found
            </h2>
            <p className="text-slate-600">
              All questions appear to be unique. Great work!
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg border border-sky-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-amber-50 border-b border-amber-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-amber-800">
                      Group
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-amber-800">
                      Questions
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-amber-800">
                      Max Similarity
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-amber-800">
                      Detected
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-amber-800">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {groups.map((group, index) => {
                    const maxSimilarity = Math.max(...Object.values(group.similarityScores));
                    
                    return (
                      <tr key={group.id} className="hover:bg-sky-50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-semibold">
                            {index + 1}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            {group.questions.slice(0, 3).map((q) => (
                              <div key={q.id} className="text-sm">
                                <span className="font-medium text-slate-700">
                                  Q{q.customId ?? q.id.slice(0, 8)}:
                                </span>
                                <span className="text-slate-600 ml-2">
                                  {q.text?.substring(0, 60)}...
                                </span>
                              </div>
                            ))}
                            {group.questions.length > 3 && (
                              <span className="text-xs text-slate-500">
                                +{group.questions.length - 3} more
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${
                              maxSimilarity >= 80
                                ? "bg-red-100 text-red-700"
                                : maxSimilarity >= 65
                                ? "bg-orange-100 text-orange-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {maxSimilarity}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {new Date(group.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleViewGroup(group)}
                            className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Side-by-Side Comparison Modal */}
      {isModalOpen && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-amber-500" />
                Similar Questions Comparison
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-500 hover:text-slate-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {selectedGroup.questions.map((question, idx) => (
                  <div
                    key={question.id}
                    className="border-2 border-slate-200 rounded-lg p-6 bg-gradient-to-br from-white to-slate-50 hover:shadow-lg transition-shadow"
                  >
                    {/* Question Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="text-lg font-bold text-slate-800">
                          Question {question.customId ?? question.id.slice(0, 8)}
                        </div>
                        <div className="text-sm text-slate-500 mt-1">
                          Created: {new Date(question.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      
                      {/* Similarity badges */}
                      <div className="flex flex-col gap-1">
                        {selectedGroup.questions.map((otherQ, otherIdx) => {
                          if (otherIdx === idx) return null;
                          const similarity = getSimilarityScore(
                            selectedGroup,
                            question.id,
                            otherQ.id
                          );
                          return (
                            <span
                              key={otherQ.id}
                              className={`text-xs px-2 py-1 rounded-full font-semibold ${
                                similarity >= 80
                                  ? "bg-red-100 text-red-700"
                                  : similarity >= 65
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              {similarity}% to Q{otherIdx + 1}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Question Text */}
                    <div className="mb-4">
                      <div className="text-xs font-semibold text-slate-600 uppercase mb-2">
                        Question Text
                      </div>
                      <div className="text-sm text-slate-800 leading-relaxed bg-white p-3 rounded border border-slate-200">
                        {question.text}
                      </div>
                    </div>

                    {/* Answers */}
                    <div className="mb-4">
                      <div className="text-xs font-semibold text-slate-600 uppercase mb-2">
                        Answer Options
                      </div>
                      <div className="space-y-2">
                        {question.answers.map((answer, ansIdx) => (
                          <div
                            key={answer.id}
                            className={`text-sm p-2 rounded ${
                              answer.isCorrect
                                ? "bg-green-50 border border-green-300 font-semibold"
                                : "bg-white border border-slate-200"
                            }`}
                          >
                            <span className="font-medium mr-2">
                              {String.fromCharCode(65 + ansIdx)}.
                            </span>
                            {answer.text}
                            {answer.isCorrect && (
                              <span className="ml-2 text-green-600 text-xs">✓ Correct</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Explanation */}
                    {question.explanation && (
                      <div className="mb-4">
                        <div className="text-xs font-semibold text-slate-600 uppercase mb-2">
                          Explanation
                        </div>
                        <div className="text-sm text-slate-700 bg-blue-50 p-3 rounded border border-blue-200">
                          {question.explanation}
                        </div>
                      </div>
                    )}

                    {/* Tags */}
                    {question.questionTags.length > 0 && (
                      <div className="mb-4">
                        <div className="text-xs font-semibold text-slate-600 uppercase mb-2">
                          Tags
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {question.questionTags.map((qt, tagIdx) => (
                            <span
                              key={tagIdx}
                              className="text-xs px-2 py-1 bg-sky-100 text-sky-700 rounded-full"
                            >
                              {qt.tag.value}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Reference */}
                    {question.references && (
                      <div className="mb-4">
                        <div className="text-xs font-semibold text-slate-600 uppercase mb-2">
                          References
                        </div>
                        <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded border border-slate-200">
                          {question.references}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4 border-t border-slate-200">
                      <button
                        onClick={() => handleKeepQuestion(question.id)}
                        disabled={actionLoading === question.id}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                      >
                        <Check className="h-4 w-4" />
                        Keep
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(question.id, question.customId)}
                        disabled={actionLoading === question.id}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
