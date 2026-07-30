import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Meeting } from '../../lib/supabase';
import { Search, Calendar, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('upcoming');

  useEffect(() => {
    fetchMeetings();
  }, [dateFilter]);

  const fetchMeetings = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      let query = supabase
        .from('meetings')
        .select('*, student:students(*), createdBy:users(*)')
        .order('meeting_date', { ascending: dateFilter === 'upcoming' });

      if (dateFilter === 'today') {
        query = query.eq('meeting_date', today);
      } else if (dateFilter === 'upcoming') {
        query = query.gte('meeting_date', today);
      } else if (dateFilter === 'past') {
        query = query.lt('meeting_date', today);
      }

      const { data, error } = await query;
      if (error) throw error;
      setMeetings(data || []);
    } catch (error) {
      console.error('Error fetching meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMeetings = meetings.filter((meeting) =>
    meeting.student?.student_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-12 h-12 border-4 border-navy-200 border-t-maroon-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Meetings</h1>
        <p className="text-gray-600 mt-1">View and manage all student meetings</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by student name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500"
            />
          </div>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500"
          >
            <option value="upcoming">Upcoming</option>
            <option value="today">Today</option>
            <option value="past">Past</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {filteredMeetings.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Calendar className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-500">No meetings found</p>
          </div>
        ) : (
          filteredMeetings.map((meeting) => (
            <Link
              key={meeting.id}
              to={`/students/${meeting.student_id}`}
              className="block bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all sm:p-6"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-navy-100 flex items-center justify-center">
                    <Calendar className="text-navy-600" size={24} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-navy-900">{meeting.student?.student_name}</p>
                    <p className="text-sm text-gray-500">Meeting #{meeting.meeting_number}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 sm:justify-end sm:gap-6">
                  <div className="text-left sm:text-right">
                    <p className="font-medium text-navy-900">{meeting.meeting_date}</p>
                    <p className="text-sm text-gray-500">{meeting.meeting_time || 'Time TBD'}</p>
                  </div>
                  <ChevronRight className="text-gray-400" size={20} />
                </div>
              </div>
              {meeting.discussion_notes && (
                <p className="mt-4 text-gray-600 text-sm line-clamp-2">{meeting.discussion_notes}</p>
              )}
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
