import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Briefcase,
  Download,
  Edit2,
  FileSpreadsheet,
  Mail,
  Phone,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { BusinessContact } from '../../lib/supabase';

const MAX_IMPORT_SIZE_MB = 5;
const MAX_IMPORT_SIZE_BYTES = MAX_IMPORT_SIZE_MB * 1024 * 1024;

const contactTypeOptions = [
  { value: 'school', label: 'School' },
  { value: 'college', label: 'College' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'partner', label: 'Partner' },
  { value: 'other', label: 'Other' },
] as const;

type ContactType = BusinessContact['contact_type'];
type ContactFormData = {
  company_name: string;
  contact_name: string;
  designation: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  contact_type: ContactType;
  notes: string;
};

type ImportDraft = ContactFormData & {
  rowNumber: number;
  errors: string[];
};

const emptyForm: ContactFormData = {
  company_name: '',
  contact_name: '',
  designation: '',
  phone: '',
  email: '',
  website: '',
  address: '',
  contact_type: 'partner',
  notes: '',
};

const headerAliases: Record<keyof ContactFormData, string[]> = {
  company_name: ['company', 'company name', 'business', 'business name', 'organization', 'organisation'],
  contact_name: ['contact', 'contact name', 'name', 'person', 'full name'],
  designation: ['designation', 'title', 'role', 'position'],
  phone: ['phone', 'mobile', 'contact number', 'phone number', 'telephone'],
  email: ['email', 'email address', 'mail'],
  website: ['website', 'site', 'url'],
  address: ['address', 'location'],
  contact_type: ['type', 'contact type', 'category'],
  notes: ['notes', 'remarks', 'comment', 'comments'],
};

export function ContactsPage() {
  const [contacts, setContacts] = useState<BusinessContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState<BusinessContact | null>(null);
  const [formData, setFormData] = useState<ContactFormData>(emptyForm);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | ContactType>('all');
  const [message, setMessage] = useState('');
  const [importDrafts, setImportDrafts] = useState<ImportDraft[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from<BusinessContact[]>('business_contacts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      setMessage(contactErrorMessage(error, 'load contacts'));
    } finally {
      setLoading(false);
    }
  };

  const filteredContacts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return contacts.filter((contact) => {
      const matchesSearch =
        !query ||
        [
          contact.company_name,
          contact.contact_name,
          contact.designation,
          contact.phone,
          contact.email,
          contact.website,
          contact.address,
          contact.notes,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));

      return matchesSearch && (typeFilter === 'all' || contact.contact_type === typeFilter);
    });
  }, [contacts, searchQuery, typeFilter]);

  const stats = [
    { label: 'All Contacts', value: contacts.length },
    { label: 'Imported', value: contacts.filter((contact) => contact.source === 'import').length },
    { label: 'Manual', value: contacts.filter((contact) => contact.source === 'manual').length },
  ];

  const openNewContactModal = () => {
    setEditingContact(null);
    setFormData(emptyForm);
    setMessage('');
    setShowModal(true);
  };

  const openEditContactModal = (contact: BusinessContact) => {
    setEditingContact(contact);
    setFormData({
      company_name: contact.company_name || '',
      contact_name: contact.contact_name || '',
      designation: contact.designation || '',
      phone: contact.phone || '',
      email: contact.email || '',
      website: contact.website || '',
      address: contact.address || '',
      contact_type: contact.contact_type || 'other',
      notes: contact.notes || '',
    });
    setMessage('');
    setShowModal(true);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const payload = toPayload(formData, editingContact?.source || 'manual');

      if (editingContact) {
        const { error } = await supabase.from('business_contacts').update(payload).eq('id', editingContact.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('business_contacts').insert(payload);
        if (error) throw error;
      }

      await fetchContacts();
      setShowModal(false);
      setMessage(editingContact ? 'Contact updated.' : 'Contact saved.');
    } catch (error) {
      console.error('Error saving contact:', error);
      setMessage(contactErrorMessage(error, 'save contact'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this contact?')) return;

    const { error } = await supabase.from('business_contacts').delete().eq('id', id);
    if (error) {
      setMessage(contactErrorMessage(error, 'delete contact'));
      return;
    }

    await fetchContacts();
    setMessage('Contact deleted.');
  };

  const handleFileImport = async (file?: File) => {
    if (!file) return;
    setMessage('');
    setImportDrafts([]);

    if (file.size > MAX_IMPORT_SIZE_BYTES) {
      setMessage(`File is too large. Please upload a file up to ${MAX_IMPORT_SIZE_MB} MB.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      setMessage('Please export the Excel sheet as CSV or TSV for this import. Direct .xlsx support needs the spreadsheet package installation.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      const text = await file.text();
      const delimiter = fileName.endsWith('.tsv') ? '\t' : guessDelimiter(text);
      const drafts = parseDelimitedContacts(text, delimiter);
      setImportDrafts(drafts);
      setMessage(`${drafts.length} row${drafts.length === 1 ? '' : 's'} ready for review.`);
    } catch (error) {
      console.error('Error importing contacts:', error);
      setMessage((error as Error).message || 'Unable to read the import file.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const saveImportedContacts = async () => {
    const validDrafts = importDrafts.filter((draft) => draft.errors.length === 0);
    if (validDrafts.length === 0) {
      setMessage('No valid rows to import.');
      return;
    }

    setImporting(true);
    setMessage('');

    try {
      const payload = validDrafts.map((draft) => toPayload(draft, 'import'));
      const { error } = await supabase.from('business_contacts').insert(payload);
      if (error) throw error;

      await fetchContacts();
      setImportDrafts([]);
      setMessage(`${validDrafts.length} contact${validDrafts.length === 1 ? '' : 's'} imported.`);
    } catch (error) {
      console.error('Error saving imported contacts:', error);
      setMessage(contactErrorMessage(error, 'save imported contacts'));
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const header = [
      'Company Name',
      'Contact Name',
      'Designation',
      'Phone',
      'Email',
      'Website',
      'Address',
      'Contact Type',
      'Notes',
    ];
    const example = [
      'True Axis Partner School',
      'Aarav Mehta',
      'Principal',
      '9876543210',
      'aarav@example.com',
      'https://example.com',
      'Ahmedabad',
      'school',
      'Annual admissions connect',
    ];
    const blob = new Blob([[header, example].map((row) => row.map(csvCell).join(',')).join('\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'business-contacts-template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-navy-200 border-t-maroon-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Business Contacts</h1>
          <p className="mt-1 text-gray-600">Save partner, school, vendor, and college contacts</p>
        </div>
        <button
          onClick={openNewContactModal}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-navy-900 px-4 py-2 text-white transition-colors hover:bg-navy-800 sm:w-auto"
        >
          <Plus size={20} />
          <span>Add Contact</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.map((item) => (
          <div key={item.label} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-600">{item.label}</p>
            <p className="mt-1 text-2xl font-bold text-navy-900">{item.value}</p>
          </div>
        ))}
      </div>

      {message && (
        <div className="rounded-lg border border-navy-100 bg-navy-50 px-4 py-3 text-sm text-navy-800">
          {message}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-navy-500 focus:ring-2 focus:ring-navy-500"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as 'all' | ContactType)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-navy-500 focus:ring-2 focus:ring-navy-500 sm:w-48"
            >
              <option value="all">All Types</option>
              {contactTypeOptions.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={downloadTemplate}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
            >
              <Download size={18} />
              <span>Template</span>
            </button>
            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-maroon-200 px-4 py-2 font-medium text-maroon-700 transition-colors hover:bg-maroon-50">
              <Upload size={18} />
              <span>Import</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv,.txt,.xls,.xlsx"
                onChange={(event) => handleFileImport(event.target.files?.[0])}
                className="sr-only"
              />
            </label>
          </div>
        </div>
        <p className="mt-3 text-xs text-gray-500">Import limit: {MAX_IMPORT_SIZE_MB} MB. CSV and TSV files exported from Excel are supported.</p>
      </div>

      {importDrafts.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-maroon-50 text-maroon-600">
                <FileSpreadsheet size={20} />
              </div>
              <div>
                <h2 className="font-semibold text-navy-900">Import Preview</h2>
                <p className="text-sm text-gray-500">
                  {importDrafts.filter((draft) => draft.errors.length === 0).length} valid,{' '}
                  {importDrafts.filter((draft) => draft.errors.length > 0).length} need changes
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setImportDrafts([])}
                className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveImportedContacts}
                disabled={importing || importDrafts.every((draft) => draft.errors.length > 0)}
                className="rounded-lg bg-navy-900 px-4 py-2 text-white transition-colors hover:bg-navy-800 disabled:opacity-50"
              >
                {importing ? 'Saving...' : 'Save Valid Rows'}
              </button>
            </div>
          </div>
          <div className="max-h-80 overflow-auto">
            <table className="w-full min-w-[840px]">
              <thead className="sticky top-0 border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-navy-900">Row</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-navy-900">Company</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-navy-900">Contact</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-navy-900">Phone</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-navy-900">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-navy-900">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {importDrafts.map((draft) => (
                  <tr key={draft.rowNumber}>
                    <td className="px-4 py-3 text-sm text-gray-600">{draft.rowNumber}</td>
                    <td className="px-4 py-3 text-sm font-medium text-navy-900">{draft.company_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{draft.contact_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{draft.phone || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{draft.email || '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      {draft.errors.length === 0 ? (
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">Ready</span>
                      ) : (
                        <span className="text-red-700">{draft.errors.join(', ')}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="divide-y divide-gray-200 md:hidden">
          {filteredContacts.map((contact) => (
            <ContactMobileCard
              key={contact.id}
              contact={contact}
              onEdit={() => openEditContactModal(contact)}
              onDelete={() => handleDelete(contact.id)}
            />
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[980px]">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-navy-900">Business</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-navy-900">Contact Person</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-navy-900">Phone</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-navy-900">Email</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-navy-900">Type</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-navy-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredContacts.map((contact) => (
                <tr key={contact.id} className="transition-colors hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-medium text-navy-900">{contact.company_name}</p>
                    {contact.website && <p className="text-sm text-gray-500">{contact.website}</p>}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-gray-700">{contact.contact_name}</p>
                    {contact.designation && <p className="text-sm text-gray-500">{contact.designation}</p>}
                  </td>
                  <td className="px-6 py-4 text-gray-700">{contact.phone || '-'}</td>
                  <td className="px-6 py-4 text-gray-700">{contact.email || '-'}</td>
                  <td className="px-6 py-4">
                    <ContactTypeBadge type={contact.contact_type} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEditContactModal(contact)}
                        className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-navy-900"
                        title="Edit"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(contact.id)}
                        className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredContacts.length === 0 && (
          <div className="p-12 text-center">
            <Briefcase className="mx-auto mb-4 text-gray-300" size={48} />
            <p className="text-gray-500">No business contacts found</p>
          </div>
        )}
      </div>

      {showModal && (
        <ContactModal
          formData={formData}
          setFormData={setFormData}
          editingContact={editingContact}
          saving={saving}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function ContactMobileCard({
  contact,
  onEdit,
  onDelete,
}: {
  contact: BusinessContact;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-navy-900">{contact.company_name}</p>
          <p className="text-sm text-gray-600">{contact.contact_name}</p>
          <div className="mt-2">
            <ContactTypeBadge type={contact.contact_type} />
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <button type="button" onClick={onEdit} className="rounded-lg p-2 text-gray-600 hover:bg-gray-100">
            <Edit2 size={18} />
          </button>
          <button type="button" onClick={onDelete} className="rounded-lg p-2 text-red-600 hover:bg-red-50">
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-2 text-sm text-gray-600">
        {contact.phone && (
          <div className="flex items-center gap-2">
            <Phone size={15} className="shrink-0 text-gray-400" />
            <span className="break-all">{contact.phone}</span>
          </div>
        )}
        {contact.email && (
          <div className="flex items-center gap-2">
            <Mail size={15} className="shrink-0 text-gray-400" />
            <span className="break-all">{contact.email}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ContactModal({
  formData,
  setFormData,
  editingContact,
  saving,
  onClose,
  onSave,
}: {
  formData: ContactFormData;
  setFormData: React.Dispatch<React.SetStateAction<ContactFormData>>;
  editingContact: BusinessContact | null;
  saving: boolean;
  onClose: () => void;
  onSave: (event: React.FormEvent) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4">
      <div className="max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl sm:max-h-[90vh]">
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 p-4 sm:p-6">
          <h2 className="text-xl font-semibold text-navy-900">
            {editingContact ? 'Edit Contact' : 'Add Contact'}
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 transition-colors hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSave} className="space-y-4 p-4 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Business / Company Name" required>
              <input
                type="text"
                value={formData.company_name}
                onChange={(event) => setFormData((current) => ({ ...current, company_name: event.target.value }))}
                className="input"
                required
              />
            </Field>
            <Field label="Contact Person" required>
              <input
                type="text"
                value={formData.contact_name}
                onChange={(event) => setFormData((current) => ({ ...current, contact_name: event.target.value }))}
                className="input"
                required
              />
            </Field>
            <Field label="Designation">
              <input
                type="text"
                value={formData.designation}
                onChange={(event) => setFormData((current) => ({ ...current, designation: event.target.value }))}
                className="input"
              />
            </Field>
            <Field label="Contact Type">
              <select
                value={formData.contact_type}
                onChange={(event) => setFormData((current) => ({ ...current, contact_type: event.target.value as ContactType }))}
                className="input"
              >
                {contactTypeOptions.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Phone">
              <input
                type="tel"
                value={formData.phone}
                onChange={(event) => setFormData((current) => ({ ...current, phone: event.target.value }))}
                className="input"
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={formData.email}
                onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))}
                className="input"
              />
            </Field>
            <Field label="Website">
              <input
                type="url"
                value={formData.website}
                onChange={(event) => setFormData((current) => ({ ...current, website: event.target.value }))}
                className="input"
              />
            </Field>
            <Field label="Address">
              <input
                type="text"
                value={formData.address}
                onChange={(event) => setFormData((current) => ({ ...current, address: event.target.value }))}
                className="input"
              />
            </Field>
          </div>

          <Field label="Notes">
            <textarea
              value={formData.notes}
              onChange={(event) => setFormData((current) => ({ ...current, notes: event.target.value }))}
              rows={3}
              className="input"
            />
          </Field>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-navy-900 px-4 py-2 text-white transition-colors hover:bg-navy-800 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </span>
      {children}
    </label>
  );
}

function ContactTypeBadge({ type }: { type: ContactType }) {
  const option = contactTypeOptions.find((item) => item.value === type);
  return (
    <span className="inline-flex rounded-full bg-navy-100 px-3 py-1 text-xs font-medium text-navy-700">
      {option?.label || 'Other'}
    </span>
  );
}

function toPayload(data: ContactFormData, source: BusinessContact['source']) {
  return {
    company_name: data.company_name.trim(),
    contact_name: data.contact_name.trim(),
    designation: data.designation.trim() || null,
    phone: data.phone.trim() || null,
    email: data.email.trim() || null,
    website: data.website.trim() || null,
    address: data.address.trim() || null,
    contact_type: data.contact_type,
    source,
    notes: data.notes.trim() || null,
  };
}

function parseDelimitedContacts(text: string, delimiter: string): ImportDraft[] {
  const rows = parseDelimitedRows(text, delimiter).filter((row) => row.some((cell) => cell.trim()));
  if (rows.length < 2) return [];

  const headers = rows[0].map(normalizeHeader);
  const fieldIndex = buildFieldIndex(headers);

  return rows.slice(1).map((row, index) => {
    const draft: ImportDraft = {
      ...emptyForm,
      rowNumber: index + 2,
      errors: [],
    };

    (Object.keys(headerAliases) as Array<keyof ContactFormData>).forEach((field) => {
      const cellIndex = fieldIndex[field];
      if (cellIndex === undefined) return;
      const rawValue = row[cellIndex]?.trim() || '';

      if (field === 'contact_type') {
        draft.contact_type = normalizeContactType(rawValue);
      } else {
        draft[field] = rawValue;
      }
    });

    if (!draft.company_name) draft.errors.push('company required');
    if (!draft.contact_name) draft.errors.push('contact required');
    if (draft.email && !isValidEmail(draft.email)) draft.errors.push('invalid email');

    return draft;
  });
}

function buildFieldIndex(headers: string[]) {
  return (Object.keys(headerAliases) as Array<keyof ContactFormData>).reduce((acc, field) => {
    const aliases = headerAliases[field].map(normalizeHeader);
    const index = headers.findIndex((header) => aliases.includes(header));
    if (index >= 0) acc[field] = index;
    return acc;
  }, {} as Partial<Record<keyof ContactFormData, number>>);
}

function parseDelimitedRows(text: string, delimiter: string) {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      currentCell += '"';
      index += 1;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === delimiter && !insideQuotes) {
      currentRow.push(currentCell);
      currentCell = '';
    } else if ((char === '\n' || char === '\r') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') index += 1;
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  currentRow.push(currentCell);
  rows.push(currentRow);
  return rows;
}

function guessDelimiter(text: string) {
  const firstLine = text.split(/\r?\n/, 1)[0] || '';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  return tabCount > commaCount ? '\t' : ',';
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
}

function normalizeContactType(value: string): ContactType {
  const normalized = value.trim().toLowerCase();
  return contactTypeOptions.some((option) => option.value === normalized)
    ? (normalized as ContactType)
    : 'other';
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function contactErrorMessage(error: unknown, action: string) {
  const message = error instanceof Error ? error.message : String(error || '');
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('permission') || lowerMessage.includes('missing or insufficient')) {
    return `Unable to ${action}. Firebase rules need to allow the business_contacts collection.`;
  }

  if (lowerMessage.includes('sign in')) {
    return `Unable to ${action}. Please sign in again and retry.`;
  }

  return message || `Unable to ${action}.`;
}
