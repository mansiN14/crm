import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Student } from '../../lib/supabase';
import { Search, Clock, CheckCircle, Users, Mail, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';

function OngoingClientsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*, assigned_counselor:users!assigned_counselor_id(*)')
        .eq('status', 'ongoing')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter((s) =>
    s.student_name.toLowerCase().includes(searchQuery.toLowerCase())
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-2">
            <Clock className="text-orange-600" size={28} />
            Ongoing Clients
          </h1>
          <p className="text-gray-600 mt-1">Students currently in progress</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
              <Users className="text-orange-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Ongoing</p>
              <p className="text-2xl font-bold text-navy-900">{students.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search students..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStudents.map((student) => (
          <div key={student.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <Users className="text-orange-600" size={20} />
                </div>
                <div>
                  <Link to={`/students/${student.id}`} className="font-semibold text-navy-900 hover:text-maroon-600">
                    {student.student_name}
                  </Link>
                  <p className="text-sm text-gray-500">
                    Joined {new Date(student.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                Ongoing
              </span>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Phone size={14} />
                <span>{student.mobile_number}</span>
              </div>
              {student.email && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail size={14} />
                  <span className="truncate">{student.email}</span>
                </div>
              )}
            </div>

            {student.assigned_counselor && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Counselor: <span className="font-medium text-navy-900">{student.assigned_counselor.name}</span>
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredStudents.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Clock className="mx-auto text-gray-300 mb-4" size={48} />
          <p className="text-gray-500">No ongoing clients found</p>
        </div>
      )}
    </div>
  );
}

function CompletedClientsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*, assigned_counselor:users!assigned_counselor_id(*)')
        .eq('status', 'completed')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter((s) =>
    s.student_name.toLowerCase().includes(searchQuery.toLowerCase())
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-2">
            <CheckCircle className="text-green-600" size={28} />
            Completed Clients
          </h1>
          <p className="text-gray-600 mt-1">Students who have completed their journey</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Completed</p>
              <p className="text-2xl font-bold text-green-600">{students.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search students..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStudents.map((student) => (
          <div key={student.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="text-green-600" size={20} />
                </div>
                <div>
                  <Link to={`/students/${student.id}`} className="font-semibold text-navy-900 hover:text-maroon-600">
                    {student.student_name}
                  </Link>
                  <p className="text-sm text-gray-500">
                    Completed {new Date(student.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                Completed
              </span>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Phone size={14} />
                <span>{student.mobile_number}</span>
              </div>
              {student.email && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail size={14} />
                  <span className="truncate">{student.email}</span>
                </div>
              )}
            </div>

            {student.assigned_counselor && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Counselor: <span className="font-medium text-navy-900">{student.assigned_counselor.name}</span>
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredStudents.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <CheckCircle className="mx-auto text-gray-300 mb-4" size={48} />
          <p className="text-gray-500">No completed clients found</p>
        </div>
      )}
    </div>
  );
}

export { OngoingClientsPage, CompletedClientsPage };
