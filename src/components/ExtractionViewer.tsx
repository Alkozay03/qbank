"use client";

import { useState } from "react";
import Image from "next/image";

interface ExtractionImage {
  id: string;
  type: string;
  ocrText?: string;
  confidence?: number;
  imageUrl?: string;
}

interface ExtractionViewerProps {
  images: ExtractionImage[];
  rawText?: string;
  confidence?: number;
  template?: string;
}

export default function ExtractionViewer({
  images,
  rawText,
  confidence,
  template
}: ExtractionViewerProps) {
  const [selectedImage, setSelectedImage] = useState<ExtractionImage | null>(null);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Extraction Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="font-medium text-blue-700">Template:</span>
            <p className="text-blue-600">{template || 'Unknown'}</p>
          </div>
          <div>
            <span className="font-medium text-blue-700">Confidence:</span>
            <p className="text-blue-600">
              {confidence ? `${(confidence * 100).toFixed(1)}%` : 'N/A'}
            </p>
          </div>
          <div>
            <span className="font-medium text-blue-700">Images:</span>
            <p className="text-blue-600">{images.length}</p>
          </div>
          <div>
            <span className="font-medium text-blue-700">Text Length:</span>
            <p className="text-blue-600">{rawText?.length || 0} chars</p>
          </div>
        </div>
      </div>

      {/* Raw Text */}
      {rawText && (
        <div className="bg-gray-50 border rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Extracted Text</h3>
          <div className="max-h-64 overflow-y-auto">
            <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
              {rawText}
            </pre>
          </div>
        </div>
      )}

      {/* Images Grid */}
      {images.length > 0 && (
        <div className="bg-white border rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Extracted Images</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map((image) => (
              <div
                key={image.id}
                className="border rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedImage(image)}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-900 capitalize">
                    {image.type}
                  </span>
                  <span className="text-xs text-gray-500">
                    {image.confidence ? `${(image.confidence * 100).toFixed(1)}%` : 'N/A'}
                  </span>
                </div>

                {image.imageUrl ? (
                  <div className="relative w-full h-32 mb-2">
                    <Image
                      src={image.imageUrl}
                      alt={`${image.type} image`}
                      fill
                      className="object-cover rounded border"
                    />
                  </div>
                ) : (
                  <div className="w-full h-32 bg-gray-200 rounded border flex items-center justify-center mb-2">
                    <span className="text-gray-500 text-sm">No Image</span>
                  </div>
                )}

                {image.ocrText && (
                  <p className="text-xs text-gray-700 line-clamp-2">
                    {image.ocrText}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-4 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900 capitalize">
                  {selectedImage.type} Image
                </h3>
                <button
                  onClick={() => setSelectedImage(null)}
                  className="text-gray-400 hover:text-gray-600 icon-hover color-smooth"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-4">
              <div className="mb-4">
                <span className="text-sm font-medium text-gray-500">Confidence: </span>
                <span className="text-sm text-gray-900">
                  {selectedImage.confidence ? `${(selectedImage.confidence * 100).toFixed(1)}%` : 'N/A'}
                </span>
              </div>

              {selectedImage.imageUrl && (
                <div className="mb-4">
                  <Image
                    src={selectedImage.imageUrl}
                    alt={`${selectedImage.type} image`}
                    width={800}
                    height={600}
                    className="max-w-full h-auto rounded border"
                  />
                </div>
              )}

              {selectedImage.ocrText && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">OCR Text:</h4>
                  <div className="bg-gray-50 border rounded p-3 max-h-32 overflow-y-auto">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">
                      {selectedImage.ocrText}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
