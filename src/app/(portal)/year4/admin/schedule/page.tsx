'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Users, ExternalLink, Plus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface ScheduleItem {
  id: string;
  title: string;
  type: 'HOSPITAL_SHIFT' | 'LECTURE';
  startsAt: string;
  endsAt: string;
  dayOfWeek: number;
  topic?: string;
  tutor?: string;
  location?: string;
  link?: string;
}

interface Schedule {
  id: string;
  title: string;
  weekStart: string;
  items: ScheduleItem[];
}

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const typeColors = {
  HOSPITAL_SHIFT: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  LECTURE: 'bg-indigo-100 text-indigo-700 border-indigo-200'
};

const typeIcons = {
  HOSPITAL_SHIFT: Users,
  LECTURE: Calendar
};

export default function ScheduleManagerPage() {
  const router = useRouter();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState<string>('');
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

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      const response = await fetch('/api/admin/schedule');
      if (response.ok) {
        const data = await response.json();
        // Handle both array and object with schedules property
        const schedulesArray = Array.isArray(data) ? data : (data.schedules || []);
        setSchedules(schedulesArray);
        if (schedulesArray.length > 0) {
          setSelectedWeek(schedulesArray[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentSchedule = schedules.find(s => s.id === selectedWeek);

  const groupedItems = currentSchedule?.items.reduce((acc, item) => {
    if (!acc[item.dayOfWeek]) {
      acc[item.dayOfWeek] = [];
    }
    acc[item.dayOfWeek].push(item);
    return acc;
  }, {} as Record<number, ScheduleItem[]>) || {};

  const formatTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-50">
        <div className="container px-4 py-6 mx-auto max-w-7xl">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-64 bg-slate-200 rounded"></div>
            <div className="h-32 w-full bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-50">
        <div className="container px-4 py-6 mx-auto max-w-7xl">
          {/* Back Button */}
          <div className="mb-6">
            <button
              onClick={() => {
                if (userRole === "MASTER_ADMIN") {
                  router.push("/year4/master-admin");
                } else {
                  router.push("/year4/admin");
                }
              }}
              className="inline-flex items-center gap-2 text-[#0284c7] hover:text-[#0ea5e9] transition-colors font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              {userRole === "MASTER_ADMIN" ? "Back to Master Admin" : "Back to Admin"}
            </button>
          </div>

          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-[#0ea5e9]">Schedule Manager</h1>
              <p className="text-slate-600 mt-1">Manage weekly schedules for Year 4 students</p>
            </div>
          <div className="flex gap-3">
            <Link href="/year4/admin/schedule-editor">
              <button className="bg-[#0ea5e9] hover:bg-[#0284c7] text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all">
                <Plus className="w-4 h-4" />
                Create Schedule
              </button>
            </Link>
          </div>
        </div>

        {schedules.length === 0 ? (
          <div className="border-dashed border-2 border-sky-200 rounded-xl bg-white shadow-sm">
            <div className="flex flex-col items-center justify-center py-12 px-6">
              <Calendar className="w-12 h-12 text-sky-400 mb-4" />
              <h3 className="text-lg font-semibold text-slate-600 mb-2">No schedules created yet</h3>
              <p className="text-slate-500 text-center mb-4">
                Create your first weekly schedule to get started
              </p>
              <Link href="/year4/admin/schedule-editor">
                <button className="bg-[#0ea5e9] hover:bg-[#0284c7] text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all">
                  <Plus className="w-4 h-4" />
                  Create First Schedule
                </button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Week Selector */}
            <div className="border border-sky-200 rounded-xl bg-white shadow-lg">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-[#0284c7] mb-2">Select Week</h3>
                <p className="text-slate-600 mb-4">Choose a week to view and manage its schedule</p>
                <div className="flex flex-wrap gap-2">
                  {schedules.map(schedule => (
                    <button
                      key={schedule.id}
                      onClick={() => setSelectedWeek(schedule.id)}
                      className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all ${
                        selectedWeek === schedule.id 
                          ? "bg-[#0ea5e9] text-white shadow-lg" 
                          : "border border-sky-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50"
                      }`}
                    >
                      <Calendar className="w-4 h-4" />
                      Week of {formatDate(schedule.weekStart)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Schedule Grid */}
            {currentSchedule && (
              <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
                {days.map((day, dayIndex) => {
                  const dayItems = groupedItems[dayIndex] || [];
                  
                  return (
                    <div key={dayIndex} className="border border-sky-200 rounded-xl bg-white shadow-sm">
                      <div className="p-4 border-b border-sky-100">
                        <h4 className="text-sm font-semibold text-[#0284c7] text-center">
                          {day}
                        </h4>
                      </div>
                      <div className="p-3 space-y-2">
                        {dayItems.length === 0 ? (
                          <div className="text-center py-4 text-slate-400 text-xs">
                            No events
                          </div>
                        ) : (
                          dayItems
                            .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
                            .map(item => {
                              const TypeIcon = typeIcons[item.type];
                              
                              return (
                                <div
                                  key={item.id}
                                  className="p-3 rounded-lg border bg-gradient-to-br from-white to-slate-50 hover:shadow-md transition-shadow"
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <span className={`text-xs px-2 py-1 rounded-full border font-medium flex items-center gap-1 ${typeColors[item.type]}`}>
                                      <TypeIcon className="w-3 h-3" />
                                      {item.type.replace('_', ' ')}
                                    </span>
                                  </div>
                                  
                                  <div className="space-y-1">
                                    <div className="flex items-center text-xs text-slate-600">
                                      <Clock className="w-3 h-3 mr-1" />
                                      {formatTime(item.startsAt)} - {formatTime(item.endsAt)}
                                    </div>
                                    
                                    {item.topic && (
                                      <p className="text-sm font-medium text-slate-800 line-clamp-2">
                                        {item.topic}
                                      </p>
                                    )}
                                    
                                    {item.tutor && (
                                      <p className="text-xs text-slate-600">
                                        Tutor: {item.tutor}
                                      </p>
                                    )}
                                    
                                    {item.location && (
                                      <div className="flex items-center text-xs text-slate-600">
                                        <MapPin className="w-3 h-3 mr-1" />
                                        {item.location}
                                      </div>
                                    )}
                                    
                                    {item.link && (
                                      <a
                                        href={item.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center text-xs text-emerald-600 hover:text-emerald-700 transition-colors"
                                      >
                                        <ExternalLink className="w-3 h-3 mr-1" />
                                        Join Link
                                      </a>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        </div>
      </div>
  );
}
