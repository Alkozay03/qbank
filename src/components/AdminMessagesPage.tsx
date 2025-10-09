"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Send, X, Image as ImageIcon, MessageCircle } from "lucide-react";
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

type ConversationUser = {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
};

type Conversation = {
  id: string;
  isActive: boolean;
  user: ConversationUser;
  userUnreadCount: number;
  adminUnreadCount: number;
  lastMessageAt: string;
  messages: Array<{
    content: string;
    createdAt: string;
    senderId: string;
  }>;
};

export default function AdminMessagesPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showEndConfirmation, setShowEndConfirmation] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [startConversationEmail, setStartConversationEmail] = useState("");
  const [startingConversation, setStartingConversation] = useState(false);
  const [startConversationError, setStartConversationError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/messages/conversations");
      if (!res.ok) throw new Error("Failed to fetch conversations");
      
      const { conversations: fetchedConversations } = await res.json();
      setConversations(fetchedConversations);
    } catch (error) {
      console.error("Error loading conversations:", error);
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
      
      // Update local conversation unread count
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, adminUnreadCount: 0 }
            : conv
        )
      );
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  const selectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    loadMessages(conversation.id);
    setSelectedImage(null);
    setImagePreview(null);
    setNewMessage("");
  };

  const sendMessage = async () => {
    if (!selectedConversation || (!newMessage.trim() && !selectedImage) || sending) return;

    try {
      setSending(true);
      
      let imageUrl = null;
      if (selectedImage) {
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
          conversationId: selectedConversation.id,
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

      // Update conversation in list
      setConversations(prev => 
        prev.map(conv => 
          conv.id === selectedConversation.id
            ? { 
                ...conv, 
                lastMessageAt: new Date().toISOString(),
                userUnreadCount: conv.userUnreadCount + 1,
                messages: [{ 
                  content: newMessage.trim(), 
                  createdAt: new Date().toISOString(),
                  senderId: message.sender.id 
                }]
              }
            : conv
        )
      );
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  };

  const startConversationByEmail = async () => {
    if (!startConversationEmail.trim() || startingConversation) return;

    try {
      setStartingConversation(true);
      setStartConversationError("");

      const res = await fetch("/api/messages/conversations/start-by-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: startConversationEmail.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStartConversationError(data.error || "Failed to start conversation");
        return;
      }

      // Add or update conversation in list
      const newConv = data.conversation;
      setConversations(prev => {
        const exists = prev.find(c => c.id === newConv.id);
        if (exists) {
          return prev; // Already exists
        }
        return [newConv, ...prev];
      });

      // Select the conversation
      setSelectedConversation(newConv);
      await loadMessages(newConv.id);
      setStartConversationEmail("");
    } catch (error) {
      console.error("Error starting conversation:", error);
      setStartConversationError("Failed to start conversation");
    } finally {
      setStartingConversation(false);
    }
  };

  const endConversation = async () => {
    if (!selectedConversation) return;

    try {
      const res = await fetch("/api/messages/end-conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: selectedConversation.id }),
      });

      if (!res.ok) throw new Error("Failed to end conversation");

      // Remove conversation from list
      setConversations(prev => prev.filter(conv => conv.id !== selectedConversation.id));
      setSelectedConversation(null);
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

  const getUserName = (user: ConversationUser) => {
    const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
    return name || user.email.split("@")[0];
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
      <div className="theme-gradient p-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Messages - Admin Panel
            </h1>
            <p className="text-white/80 mt-1">Manage conversations with users.</p>
          </div>
          <button
            onClick={() => router.push("/year4")}
            className="px-6 py-2.5 bg-white text-primary rounded-xl hover:shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 font-medium"
          >
            Return to Year 4 Portal
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[700px]">
          {/* Users List */}
          <div className="bg-white rounded-2xl shadow-xl border-2 border-primary flex flex-col">
            <div className="p-4 border-b-2 border-primary">
              <div className="flex items-center gap-2 text-primary mb-3">
                <MessageCircle className="w-5 h-5" />
                <h2 className="font-semibold">Active Conversations ({conversations.length})</h2>
              </div>
              
              {/* Start Conversation by Email */}
              <div className="mt-3">
                <p className="text-xs text-primary/70 mb-2 font-medium">Start new conversation:</p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={startConversationEmail}
                    onChange={(e) => {
                      setStartConversationEmail(e.target.value);
                      setStartConversationError("");
                    }}
                    onKeyPress={(e) => e.key === "Enter" && startConversationByEmail()}
                    placeholder="Enter user email..."
                    className="flex-1 px-3 py-2 text-sm border-2 border-primary/20 rounded-lg focus:outline-none focus:border-primary transition-colors"
                    disabled={startingConversation}
                  />
                  <button
                    onClick={startConversationByEmail}
                    disabled={!startConversationEmail.trim() || startingConversation}
                    className="px-4 py-2 theme-gradient text-white rounded-lg hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm font-medium"
                  >
                    {startingConversation ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      "Start"
                    )}
                  </button>
                </div>
                {startConversationError && (
                  <p className="text-xs text-red-600 mt-1 font-medium">{startConversationError}</p>
                )}
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="p-6 text-center text-secondary">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No active conversations</p>
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {conversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      onClick={() => selectConversation(conversation)}
                      className={`w-full p-3 rounded-xl text-left transition-all duration-200 ${
                        selectedConversation?.id === conversation.id
                          ? "theme-gradient text-white shadow-lg"
                          : "hover:bg-primary/5 text-primary border border-transparent hover:border-primary/20"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{getUserName(conversation.user)}</p>
                            {conversation.adminUnreadCount > 0 && (
                              <span className="bg-red-600 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[18px] flex items-center justify-center font-bold shadow-lg border border-white/50">
                                {conversation.adminUnreadCount}
                              </span>
                            )}
                          </div>
                          <p className={`text-xs truncate mt-1 ${
                            selectedConversation?.id === conversation.id ? "text-inverse/80" : "text-secondary"
                          }`}>
                            {conversation.messages[0]?.content || "No messages"}
                          </p>
                        </div>
                        <div className={`text-xs ${
                          selectedConversation?.id === conversation.id ? "text-inverse/60" : "text-secondary/60"
                        }`}>
                          {formatTime(conversation.lastMessageAt)}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-2">
            {!selectedConversation ? (
              <div className="bg-white rounded-2xl shadow-xl border-2 border-primary/20 h-full flex items-center justify-center">
                <div className="text-center text-primary/60">
                  <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-xl font-semibold mb-2 text-primary">Select a Conversation</h3>
                  <p>Choose a user from the list to start messaging</p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-xl border-2 border-primary h-full flex flex-col overflow-hidden">
                {/* Chat Header */}
                <div className="theme-gradient p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-white">{getUserName(selectedConversation.user)}</h3>
                      <p className="text-sm text-white opacity-90">{selectedConversation.user.email}</p>
                    </div>
                    {selectedConversation.userUnreadCount > 0 && (
                      <span className="bg-white text-primary text-xs px-2 py-1 rounded-full font-medium">
                        User has {selectedConversation.userUnreadCount} unread
                      </span>
                    )}
                  </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                  {messages.length === 0 ? (
                    <div className="text-center text-primary/60 py-12">
                      <Send className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p className="text-primary">No messages yet. Send the first message!</p>
                    </div>
                  ) : (
                    messages.map((message) => {
                      const isAdminMessage = ["WEBSITE_CREATOR", "MASTER_ADMIN", "ADMIN"].includes(message.sender.role);
                      return (
                      <div
                        key={message.id}
                        className={`flex ${isAdminMessage ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-md ${
                          isAdminMessage
                            ? "theme-gradient text-white rounded-br-sm"
                            : "bg-white text-primary rounded-bl-sm border-2 border-primary/10"
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
                          <p className={`text-xs mt-2 opacity-70 ${
                            isAdminMessage ? "text-inverse" : "text-secondary"
                          }`}>
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
                <div className="border-t-2 border-primary p-4 bg-white -mx-[2px] -mb-[2px]" style={{ position: 'relative' }}>
                  {/* Image Preview */}
                  {imagePreview && (
                    <div className="mb-4 relative inline-block">
                      <Image src={imagePreview} alt="Preview" width={80} height={80} className="h-20 w-20 object-cover rounded-lg" />
                      <button
                        onClick={() => {
                          setSelectedImage(null);
                          setImagePreview(null);
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 shadow-lg"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  <div
                    className={`flex gap-3 p-3 pb-5 rounded-t-xl transition-all relative ${
                      dragOver ? "bg-primary/5" : "bg-gray-50"
                    }`}
                    style={{ 
                      borderBottom: 'none !important', 
                      border: 'none !important',
                      borderWidth: '0 !important',
                      boxShadow: 'none !important',
                      outline: 'none !important',
                      marginBottom: '-2px',
                      paddingBottom: '1.5rem'
                    }}
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
                      placeholder="Type your reply... (or drag & drop an image)"
                      className="flex-1 bg-transparent border-none outline-none text-primary placeholder-primary/50"
                    />

                    <button
                      onClick={sendMessage}
                      disabled={(!newMessage.trim() && !selectedImage) || sending}
                      className="p-2 rounded-lg theme-gradient text-white hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium shadow-md hover:shadow-lg"
                    >
                      End Conversation
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* End Confirmation Modal */}
      {showEndConfirmation && selectedConversation && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md mx-4 border-2 border-primary/20 shadow-2xl">
            <h3 className="text-xl font-bold text-primary mb-3">End Conversation</h3>
            <p className="text-primary/80 mb-6">
              You are about to end the conversation with {getUserName(selectedConversation.user)}. 
              The chat history will be deleted permanently.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEndConfirmation(false)}
                className="flex-1 px-4 py-2 theme-gradient text-white rounded-xl hover:shadow-lg transition-all duration-200"
              >
                Cancel
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