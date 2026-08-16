import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/useAuth';
import { supabase } from '../../lib/supabase';
import { User, Lock, Bell, Save } from 'lucide-react';

export function SettingsPage() {
  const { user, refreshUser, updatePassword } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [notifications, setNotifications] = useState({
    email: user?.notification_preferences?.email ?? true,
    browser: user?.notification_preferences?.browser ?? true,
    reminders: user?.notification_preferences?.reminders ?? true,
    payments: user?.notification_preferences?.payments ?? true,
  });

  useEffect(() => {
    setProfileData({
      name: user?.name || '',
      email: user?.email || '',
    });
    setNotifications({
      email: user?.notification_preferences?.email ?? true,
      browser: user?.notification_preferences?.browser ?? true,
      reminders: user?.notification_preferences?.reminders ?? true,
      payments: user?.notification_preferences?.payments ?? true,
    });
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    setSaving(true);
    setStatusMessage(null);

    const { error } = await supabase
      .from('users')
      .update({ name: profileData.name.trim() })
      .eq('id', user.id);

    if (error) {
      setStatusMessage({ type: 'error', text: error.message || 'Unable to save profile changes.' });
    } else {
      await refreshUser();
      setStatusMessage({ type: 'success', text: 'Profile updated successfully.' });
    }

    setSaving(false);
  };

  const handleSaveNotifications = async () => {
    if (!user?.id) return;
    setSaving(true);
    setStatusMessage(null);

    const { error } = await supabase
      .from('users')
      .update({ notification_preferences: notifications })
      .eq('id', user.id);

    if (error) {
      setStatusMessage({ type: 'error', text: error.message || 'Unable to save notification preferences.' });
    } else {
      await refreshUser();
      setStatusMessage({ type: 'success', text: 'Notification preferences updated.' });
    }

    setSaving(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setStatusMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    if (passwordData.currentPassword === passwordData.newPassword) {
      setStatusMessage({ type: 'error', text: 'Choose a new password that is different from your current password.' });
      return;
    }

    setSaving(true);
    const { error } = await updatePassword(passwordData.currentPassword, passwordData.newPassword);

    if (error) {
      setStatusMessage({ type: 'error', text: error.message || 'Unable to update password.' });
    } else {
      setSaving(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setStatusMessage({ type: 'success', text: 'Password updated successfully.' });
    }

    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account preferences</p>
      </div>

      <div className="flex gap-4 border-b border-gray-200">
        {[
          { key: 'profile', label: 'Profile', icon: User },
          { key: 'security', label: 'Security', icon: Lock },
          { key: 'notifications', label: 'Notifications', icon: Bell },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'text-navy-900 border-b-2 border-navy-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {statusMessage && (
          <div className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
            statusMessage.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}>
            {statusMessage.text}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="max-w-lg space-y-6">
            <div className="flex items-center gap-6 mb-8">
              <div className="w-20 h-20 rounded-full bg-navy-100 flex items-center justify-center text-navy-600 text-2xl font-bold">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-navy-900">{user?.name}</h3>
                <p className="text-gray-500 capitalize">{user?.role}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <input
                type="text"
                value={profileData.name}
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <input
                type="email"
                value={profileData.email}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
              />
              <p className="text-sm text-gray-500 mt-1">Contact admin to change email</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
              <input
                type="text"
                value={user?.role}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 capitalize"
              />
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-navy-900 hover:bg-navy-800 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <Save size={18} />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>

          </div>
        )}

        {activeTab === 'security' && (
          <form onSubmit={handleChangePassword} className="max-w-lg space-y-6">
            <h3 className="text-lg font-semibold text-navy-900">Change Password</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
              <input
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500"
                required
                minLength={8}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-navy-900 hover:bg-navy-800 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <Lock size={18} />
              {saving ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}

        {activeTab === 'notifications' && (
          <div className="max-w-lg space-y-6">
            <h3 className="text-lg font-semibold text-navy-900">Notification Preferences</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-navy-900">Email Notifications</p>
                  <p className="text-sm text-gray-500">Receive updates via email</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.email}
                    onChange={(e) => setNotifications({ ...notifications, email: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-navy-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-navy-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-navy-900">Browser Notifications</p>
                  <p className="text-sm text-gray-500">Show desktop notifications</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.browser}
                    onChange={(e) => setNotifications({ ...notifications, browser: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-navy-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-navy-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-navy-900">Reminder Alerts</p>
                  <p className="text-sm text-gray-500">Get notified for reminders</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.reminders}
                    onChange={(e) => setNotifications({ ...notifications, reminders: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-navy-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-navy-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-navy-900">Payment Alerts</p>
                  <p className="text-sm text-gray-500">Notify for payment due dates</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.payments}
                    onChange={(e) => setNotifications({ ...notifications, payments: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-navy-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-navy-600"></div>
                </label>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveNotifications}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-navy-900 hover:bg-navy-800 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <Save size={18} />
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
