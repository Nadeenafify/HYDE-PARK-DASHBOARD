import { useEffect, useState } from 'react'
import { UserPlus, Pencil, X } from 'lucide-react'
import type { AppUser, Role } from '../types'
import { ROLES, ROLE_LABELS } from '../types'
import { SectionCard } from './ui'
import { api } from '../lib/api'
import { useToast } from './Toast'

const ROLE_TONE: Record<Role, { badge: string; avatar: string }> = {
  super_admin: {
    badge: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    avatar: 'from-indigo-500 to-indigo-700',
  },
  manager: {
    badge: 'bg-sky-50 text-sky-700 ring-sky-200',
    avatar: 'from-sky-500 to-sky-700',
  },
  viewer: {
    badge: 'bg-slate-100 text-slate-600 ring-slate-200',
    avatar: 'from-slate-400 to-slate-600',
  },
}

function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((s) => s[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  disabled,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  disabled?: boolean
}) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-500">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/15 disabled:opacity-60"
      />
    </div>
  )
}

function RoleSelect({
  value,
  onChange,
  disabled,
  className = '',
}: {
  value: Role
  onChange: (r: Role) => void
  disabled?: boolean
  className?: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as Role)}
      disabled={disabled}
      className={`rounded-xl border border-slate-200 bg-white text-sm text-slate-700 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 disabled:opacity-60 ${className}`}
    >
      {ROLES.map((r) => (
        <option key={r} value={r}>
          {ROLE_LABELS[r]}
        </option>
      ))}
    </select>
  )
}

export function UsersAdmin({ currentUserId }: { currentUserId?: string }) {
  const toast = useToast()
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  // add form
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('viewer')
  const [saving, setSaving] = useState(false)

  // edit modal
  const [editing, setEditing] = useState<AppUser | null>(null)
  const [eName, setEName] = useState('')
  const [eEmail, setEEmail] = useState('')
  const [eRole, setERole] = useState<Role>('viewer')
  const [eActive, setEActive] = useState(true)
  const [ePassword, setEPassword] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let active = true
    api
      .listUsers()
      .then((u) => active && setUsers(u))
      .catch(
        (e) =>
          active &&
          setListError(e instanceof Error ? e.message : 'Failed to load users.'),
      )
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  async function addUser(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const u = await api.createUser({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
      })
      setUsers((prev) => [...prev, u])
      setName('')
      setEmail('')
      setPassword('')
      setRole('viewer')
      toast.success(`${u.name} added as ${ROLE_LABELS[u.role]}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add user.')
    } finally {
      setSaving(false)
    }
  }

  function openEdit(u: AppUser) {
    setEditing(u)
    setEName(u.name)
    setEEmail(u.email)
    setERole(u.role)
    setEActive(u.isActive)
    setEPassword('')
  }

  async function saveEdit() {
    if (!editing) return
    setSavingEdit(true)
    try {
      const payload: {
        name?: string
        email?: string
        role?: Role
        isActive?: boolean
        password?: string
      } = { name: eName.trim() }
      if (eEmail.trim().toLowerCase() !== editing.email) {
        payload.email = eEmail.trim()
      }
      const self = editing.id === currentUserId
      if (!self) {
        payload.role = eRole
        payload.isActive = eActive
      }
      if (ePassword) payload.password = ePassword
      const updated = await api.updateUser(editing.id, payload)
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
      setEditing(null)
      toast.success(`${updated.name} updated`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save changes.')
    } finally {
      setSavingEdit(false)
    }
  }

  async function removeUser() {
    if (!editing) return
    if (!window.confirm(`Delete ${editing.name}? This cannot be undone.`)) return
    const { id, name } = editing
    setDeleting(true)
    try {
      await api.deleteUser(id)
      setUsers((prev) => prev.filter((u) => u.id !== id))
      setEditing(null)
      toast.success(`${name} deleted`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete user.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <SectionCard title={`Users (${users.length})`} className="lg:col-span-2">
        {loading ? (
          <p className="px-5 py-16 text-center text-sm text-slate-400">Loading…</p>
        ) : listError ? (
          <p className="px-5 py-16 text-center text-sm text-rose-600">{listError}</p>
        ) : (
          <ul className="divide-y divide-slate-50">
            {users.map((u) => {
              const self = u.id === currentUserId
              const tone = ROLE_TONE[u.role]
              return (
                <li
                  key={u.id}
                  className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-slate-50/70"
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br text-xs font-semibold text-white shadow-sm ${tone.avatar}`}
                  >
                    {initials(u.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-800">
                      {u.name}{' '}
                      {self && <span className="text-xs text-slate-400">(you)</span>}
                    </p>
                    <p className="truncate text-xs text-slate-400">{u.email}</p>
                    {/* badges shown under the email on mobile */}
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 sm:hidden">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${tone.badge}`}
                      >
                        {ROLE_LABELS[u.role]}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${
                          u.isActive
                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                            : 'bg-slate-100 text-slate-500 ring-slate-200'
                        }`}
                      >
                        {u.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`hidden shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset sm:inline-block ${tone.badge}`}
                  >
                    {ROLE_LABELS[u.role]}
                  </span>
                  <span
                    className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset sm:inline-block ${
                      u.isActive
                        ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                        : 'bg-slate-100 text-slate-500 ring-slate-200'
                    }`}
                  >
                    {u.isActive ? 'Active' : 'Disabled'}
                  </span>
                  <button
                    type="button"
                    onClick={() => openEdit(u)}
                    className="shrink-0 rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:border-slate-300 hover:bg-white hover:text-slate-700"
                    aria-label={`Edit ${u.name}`}
                  >
                    <Pencil size={14} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Add user">
        <form onSubmit={addUser} className="space-y-3 px-5 py-5">
          <Field label="Name" value={name} onChange={setName} placeholder="Full name" />
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="name@example.com"
          />
          <Field
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="At least 6 characters"
          />
          <div>
            <label className="text-xs font-medium text-slate-500">Role</label>
            <RoleSelect
              value={role}
              onChange={setRole}
              className="mt-1 w-full px-3 py-2"
            />
          </div>
          <button
            type="submit"
            disabled={saving || !name.trim() || !email.trim() || password.length < 6}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-linear-to-r from-brand-600 to-brand-700 px-3 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-600/20 transition hover:from-brand-500 hover:to-brand-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none"
          >
            <UserPlus size={16} /> {saving ? 'Adding…' : 'Add user'}
          </button>
        </form>
      </SectionCard>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="animate-fade absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setEditing(null)}
            aria-hidden="true"
          />
          <div className="animate-rise relative z-10 w-full max-w-sm rounded-2xl bg-white p-5 shadow-pop">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Edit user</h3>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <Field label="Name" value={eName} onChange={setEName} />
              <Field
                label="Email"
                type="email"
                value={eEmail}
                onChange={setEEmail}
              />
              <div>
                <label className="text-xs font-medium text-slate-500">Role</label>
                <RoleSelect
                  value={eRole}
                  onChange={setERole}
                  disabled={editing.id === currentUserId}
                  className="mt-1 w-full px-3 py-2"
                />
              </div>
              <Field
                label="New password (optional)"
                type="password"
                value={ePassword}
                onChange={setEPassword}
                placeholder="Leave blank to keep current"
              />
              <label
                className={`flex items-center gap-2.5 ${
                  editing.id === currentUserId ? 'opacity-50' : 'cursor-pointer'
                }`}
              >
                <input
                  type="checkbox"
                  checked={eActive}
                  disabled={editing.id === currentUserId}
                  onChange={(e) => setEActive(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500/30"
                />
                <span className="text-sm font-medium text-slate-700">
                  Active (can sign in)
                </span>
              </label>
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              {editing.id !== currentUserId ? (
                <button
                  type="button"
                  onClick={removeUser}
                  disabled={deleting || savingEdit}
                  className="rounded-xl border border-rose-200 px-3 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              ) : (
                <span className="hidden sm:block" />
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={
                    savingEdit ||
                    deleting ||
                    !eName.trim() ||
                    !eEmail.trim() ||
                    (!!ePassword && ePassword.length < 6)
                  }
                  className="rounded-xl bg-linear-to-r from-brand-600 to-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:from-brand-500 hover:to-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingEdit ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
