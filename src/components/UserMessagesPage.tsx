"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Send, X, Image as ImageIcon } from "lucide-react";
import Image from "next/image";

type Message = {
  id: string;
  content: string;
  imageUrl?: string;
  createdAt: string;
  sender: {
    id: string;
    firstName?: string;
    lastName?: string;
    role: string;
  };
};

type Conversation = {
  id: string;
  isActive: boolean;
  messages: Message[];
};

export default function UserMessagesPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  
  // Detect which year we're in from the referrer or default to year4
  const [currentYear, setCurrentYear] = useState('year4');
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.startsWith('/year1')) {
        setCurrentYear('year1');
      } else if (path.startsWith('/year2')) {
        setCurrentYear('year2');
      } else if (path.startsWith('/year3')) {
        setCurrentYear('year3');
      } else if (path.startsWith('/year5')) {
        setCurrentYear('year5');
      }
    }
  }, []);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showEndConfirmation, setShowEndConfirmation] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadConversation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadConversation = async () => {
    try {
      setIsLoading(true);
      
      // First, try to get existing conversation
      const conversationsRes = await fetch("/api/messages/conversations");
      if (!conversationsRes.ok) throw new Error("Failed to fetch conversations");
      
      const { conversations } = await conversationsRes.json();
      
      if (conversations.length > 0) {
        const conv = conversations[0];
        setConversation(conv);
        await loadMessages(conv.id);
      }
      
      // Small delay to ensure smooth transition
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error("Error loading conversation:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const res = await fetch(`/api/messages?conversationId=${conversationId}`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      
      const { messages: fetchedMessages } = await res.json();
      setMessages(fetchedMessages);
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  const startConversation = async (messageType: "WEBSITE_CREATOR" | "MASTER_ADMIN" | "CONTACT_ADMIN") => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/messages/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageType }),
      });
      
      if (!res.ok) throw new Error("Failed to start conversation");
      
      const { conversation: newConv } = await res.json();
      setConversation(newConv);
      setMessages([]);
      
      // Small delay to ensure smooth transition
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error("Error starting conversation:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!conversation || (!newMessage.trim() && !selectedImage) || sending) return;

    try {
      setSending(true);
      
      let imageUrl = null;
      if (selectedImage) {
        // For now, we'll create a data URL - in production you'd upload to a service
        imageUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(selectedImage);
        });
      }

      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: conversation.id,
          content: newMessage.trim(),
          imageUrl,
        }),
      });

      if (!res.ok) throw new Error("Failed to send message");

      const { message } = await res.json();
      setMessages((prev) => [...prev, message]);
      setNewMessage("");
      setSelectedImage(null);
      setImagePreview(null);
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  };

  const endConversation = async () => {
    if (!conversation) return;

    try {
      const res = await fetch("/api/messages/end-conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: conversation.id }),
      });

      if (!res.ok) throw new Error("Failed to end conversation");

      setConversation(null);
      setMessages([]);
      setShowEndConfirmation(false);
    } catch (error) {
      console.error("Error ending conversation:", error);
    }
  };

  const handleImageSelect = (file: File) => {
    if (file && file.type.startsWith("image/")) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith("image/"));
    if (imageFile) {
      handleImageSelect(imageFile);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <svg
          className="animate-spin"
          style={{ animationDuration: '1s', width: '48px', height: '48px' }}
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="200 80"
            className="text-primary opacity-50"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="theme-gradient p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Messages
            </h1>
            <p className="text-white opacity-90 mt-1">Contact the website creator, master admin, or an admin.</p>
          </div>
          <button
            onClick={() => router.push(`/${currentYear}`)}
            className="px-4 py-2 bg-white text-primary rounded-xl hover:shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 font-medium"
          >
            Return to {currentYear === 'year1' ? 'Year 1' : currentYear === 'year2' ? 'Year 2' : currentYear === 'year3' ? 'Year 3' : currentYear === 'year5' ? 'Year 5' : 'Year 4'} Portal
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6">
        {!conversation ? (
          /* Start Conversation - Choose recipient type */
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center border-2 border-primary">
              <div className="mb-6">
                <div className="w-20 h-20 theme-gradient rounded-full flex items-center justify-center mx-auto mb-4">
                  <Send className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-primary mb-2">Start a New Conversation</h2>
                <p className="text-primary opacity-80">
                  Choose who you&apos;d like to contact. They will be notified and can respond to your messages.
                </p>
              </div>

              {/* Three options: Website Creator, Master Admin, or Contact Admin */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                {/* Website Creator Button */}
                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-6 border-2 border-amber-200 hover:border-amber-400 transition-all duration-200 hover:shadow-lg">
                  <div className="mb-4">
                    <svg className="w-12 h-12 mx-auto text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-amber-900 mb-2">Website Creator</h3>
                  <p className="text-sm text-amber-700 mb-4">
                    Contact the website creator directly for questions about the platform or technical issues.
                  </p>
                  <button
                    onClick={() => startConversation("WEBSITE_CREATOR")}
                    className="w-full px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-xl font-semibold hover:shadow-lg hover:opacity-90 transition-all duration-200 transform hover:scale-105"
                  >
                    Contact Creator
                  </button>
                </div>

                {/* Master Admin Button */}
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border-2 border-blue-200 hover:border-blue-400 transition-all duration-200 hover:shadow-lg">
                  <div className="mb-4">
                    <svg className="w-12 h-12 mx-auto text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-blue-900 mb-2">Master Admin</h3>
                  <p className="text-sm text-blue-700 mb-4">
                    Contact a master admin for important questions or administrative issues.
                  </p>
                  <button
                    onClick={() => startConversation("MASTER_ADMIN")}
                    className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-semibold hover:shadow-lg hover:opacity-90 transition-all duration-200 transform hover:scale-105"
                  >
                    Contact Master Admin
                  </button>
                </div>

                {/* Contact Admin Button */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-200 hover:border-purple-400 transition-all duration-200 hover:shadow-lg">
                  <div className="mb-4">
                    <svg className="w-12 h-12 mx-auto text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-purple-900 mb-2">Contact Admin</h3>
                  <p className="text-sm text-purple-700 mb-4">
                    Get help from one of our admins for questions about content or quizzes.
                  </p>
                  <button
                    onClick={() => startConversation("CONTACT_ADMIN")}
                    className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg hover:opacity-90 transition-all duration-200 transform hover:scale-105"
                  >
                    Contact Admin
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Chat Interface */
          <div className="bg-white rounded-2xl shadow-xl border-2 border-primary h-[600px] flex flex-col overflow-hidden">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-primary py-12">
                  <Send className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No messages yet. Send your first message below!</p>
                </div>
              ) : (
                messages.map((message) => {
                  const isAdminMessage = ["WEBSITE_CREATOR", "MASTER_ADMIN", "ADMIN"].includes(message.sender.role);
                  return (
                  <div
                    key={message.id}
                    className={`flex ${isAdminMessage ? "justify-start" : "justify-end"}`}
                  >
                    <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                      isAdminMessage
                        ? "bg-gray-100 text-primary rounded-bl-sm"
                        : "theme-gradient text-white rounded-br-sm"
                    }`}>
                      {message.imageUrl && (
                        <div className="mb-2">
                          <Image
                            src={message.imageUrl}
                            alt="Shared image"
                            width={300}
                            height={200}
                            className="rounded-xl max-w-full h-auto"
                          />
                        </div>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs mt-2 opacity-70">
                        {formatTime(message.createdAt)}
                      </p>
                    </div>
                  </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t-2 border-primary p-4 bg-white -mx-[2px] -mb-[2px]">
              {/* Image Preview */}
              {imagePreview && (
                <div className="mb-4 relative inline-block">
                  <Image src={imagePreview} alt="Preview" width={80} height={80} className="h-20 w-20 object-cover rounded-lg" />
                  <button
                    onClick={() => {
                      setSelectedImage(null);
                      setImagePreview(null);
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              <div
                className={`flex gap-3 p-3 rounded-xl transition-colors ${
                  dragOver ? "bg-primary/5" : "bg-gray-50"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageSelect(file);
                  }}
                  className="hidden"
                />
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-lg theme-gradient text-white hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200"
                  title="Attach image"
                >
                  <ImageIcon className="w-5 h-5" />
                </button>

                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  placeholder="Type your message... (or drag & drop an image)"
                  className="flex-1 bg-transparent border-none outline-none text-primary placeholder-gray-400"
                />

                <button
                  onClick={sendMessage}
                  disabled={(!newMessage.trim() && !selectedImage) || sending}
                  className="p-2 rounded-lg theme-gradient text-white hover:shadow-lg hover:opacity-90 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {sending ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* End Conversation Button */}
              <div className="mt-3 text-center">
                <button
                  onClick={() => setShowEndConfirmation(true)}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                >
                  End Conversation
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* End Confirmation Modal */}
      {showEndConfirmation && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md mx-4 border-2 border-primary">
            <h3 className="text-xl font-bold text-primary mb-3">End Conversation</h3>
            <p className="text-primary opacity-80 mb-6">
              You are about to end this conversation. The chat history will be deleted. 
              If you want to keep the chat history, press &ldquo;Return to {currentYear === 'year1' ? 'Year 1' : currentYear === 'year2' ? 'Year 2' : currentYear === 'year3' ? 'Year 3' : currentYear === 'year5' ? 'Year 5' : 'Year 4'} Portal.&rdquo;
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEndConfirmation(false)}
                className="flex-1 px-4 py-2 theme-gradient text-white rounded-xl hover:shadow-lg hover:opacity-90 transition-all duration-200"
              >
                Return to {currentYear === 'year1' ? 'Year 1' : currentYear === 'year2' ? 'Year 2' : currentYear === 'year3' ? 'Year 3' : currentYear === 'year5' ? 'Year 5' : 'Year 4'} Portal
              </button>
              <button
                onClick={endConversation}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"
              >
                End Conversation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}