"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";

interface AIExtraction {
  id: string;
  imagePath?: string;
  rawText?: string;
  confidence?: number;
  template?: string;
  processingTime?: number;
  createdAt: string;
  question?: {
    id: string;
    text?: string;
    customId?: number;
  };
  images: Array<{
    id: string;
    type: string;
    ocrText?: string;
    confidence?: number;
    imageUrl?: string;
  }>;
}

export default function ExtractionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const extractionId = params.id as string;

  const [extraction, setExtraction] = useState<AIExtraction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExtraction = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ai/extractions/${extractionId}`);
      if (response.ok) {
        const data = await response.json();
        setExtraction(data);
      } else {
        setError("Failed to fetch extraction");
      }
    } catch (error) {
      console.error("Error fetching extraction:", error);
      setError("Failed to fetch extraction");
    } finally {
      setLoading(false);
    }
  }, [extractionId]);

  useEffect(() => {
    if (extractionId) {
      fetchExtraction();
    }
  }, [extractionId, fetchExtraction]);

  const unlinkQuestion = async () => {
    if (!extraction?.question) return;

    try {
      const response = await fetch(`/api/ai/link?extractionId=${extractionId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Refresh the extraction data
        fetchExtraction();
      } else {
        alert("Failed to unlink question");
      }
    } catch (error) {
      console.error("Error unlinking question:", error);
      alert("Failed to unlink question");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading extraction...</p>
        </div>
      </div>
    );
  }

  if (error || !extraction) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error || "Extraction not found"}</p>
          <button
            onClick={() => router.push('/admin/extractions')}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Back to Extractions
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Extraction Details</h1>
              <div className="flex space-x-3">
                <button
                  onClick={() => router.push('/admin/extractions')}
                  className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
                >
                  Back to List
                </button>
                {!extraction.question && (
                  <button
                    onClick={() => router.push(`/admin/extractions/${extractionId}/link`)}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                  >
                    Link to Question
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Basic Information</h3>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">ID</dt>
                      <dd className="text-sm text-gray-900">{extraction.id}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Created</dt>
                      <dd className="text-sm text-gray-900">{formatDate(extraction.createdAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Template</dt>
                      <dd className="text-sm text-gray-900">{extraction.template || 'Unknown'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Confidence</dt>
                      <dd className="text-sm text-gray-900">
                        {extraction.confidence ? `${(extraction.confidence * 100).toFixed(1)}%` : 'N/A'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Processing Time</dt>
                      <dd className="text-sm text-gray-900">
                        {extraction.processingTime ? `${extraction.processingTime.toFixed(2)}s` : 'N/A'}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Linked Question */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Linked Question</h3>
                  {extraction.question ? (
                    <div className="bg-green-50 border border-green-200 rounded-md p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium text-green-800">
                            {extraction.question.customId ? `Question ${extraction.question.customId}` : extraction.question.id}
                          </p>
                          <p className="text-sm text-green-700 mt-1">
                            {extraction.question.text?.substring(0, 100)}...
                          </p>
                        </div>
                        <button
                          onClick={unlinkQuestion}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Unlink
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500">Not linked to any question</p>
                  )}
                </div>
              </div>

              {/* Extracted Content */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Extracted Text</h3>
                  <div className="bg-gray-50 border rounded-md p-4 max-h-64 overflow-y-auto">
                    <pre className="text-sm text-gray-900 whitespace-pre-wrap">
                      {extraction.rawText || 'No text extracted'}
                    </pre>
                  </div>
                </div>

                {/* Images */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Extracted Images ({extraction.images.length})</h3>
                  {extraction.images.length > 0 ? (
                    <div className="space-y-3">
                      {extraction.images.map((image) => (
                        <div key={image.id} className="bg-gray-50 border rounded-md p-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-900 capitalize">{image.type}</span>
                            <span className="text-sm text-gray-500">
                              {image.confidence ? `${(image.confidence * 100).toFixed(1)}%` : 'N/A'}
                            </span>
                          </div>
                          {image.ocrText && (
                            <p className="text-sm text-gray-700 mb-2">{image.ocrText}</p>
                          )}
                          {image.imageUrl && (
                            <Image
                              src={image.imageUrl}
                              alt={`${image.type} image`}
                              width={400}
                              height={300}
                              className="max-w-full h-auto rounded border"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No images extracted</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
