import { useEffect, useState } from 'react'
import { UserPlus, Users as UsersIcon } from 'lucide-react'
import type { AppUser, Role } from '../types'
import { ROLES, ROLE_LABELS } from '../types'
import { SectionCard } from './ui'
import { api } from '../lib/api'

function Input({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
}) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-500">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/15"
      />
    </div>
  )
}

export function UsersAdmin({ currentUserId }: { currentUserId?: string }) {
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('viewer')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    api
      .listUsers()
      .then((u) => active && setUsers(u))
      .catch((e) =>
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
    setFormError(null)
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
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not add user.')
    } finally {
      setSaving(false)
    }
  }

  async function patch(id: string, change: Partial<Pick<AppUser, 'role' | 'isActive'>>) {
    const snapshot = users
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...change } : u)))
    try {
      await api.updateUser(id, change)
    } catch {
      setUsers(snapshot)
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
              return (
                <li key={u.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                    <UsersIcon size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-800">
                      {u.name}{' '}
                      {self && <span className="text-xs text-slate-400">(you)</span>}
                    </p>
                    <p className="truncate text-xs text-slate-400">{u.email}</p>
                  </div>
                  <select
                    value={u.role}
                    onChange={(e) => patch(u.id, { role: e.target.value as Role })}
                    disabled={self}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 outline-none focus:border-brand-500 disabled:opacity-60"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => patch(u.id, { isActive: !u.isActive })}
                    disabled={self}
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset transition disabled:opacity-60 ${
                      u.isActive
                        ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                        : 'bg-slate-100 text-slate-500 ring-slate-200'
                    }`}
                  >
                    {u.isActive ? 'Active' : 'Disabled'}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Add user">
        <form onSubmit={addUser} className="space-y-3 px-5 py-5">
          <Input label="Name" value={name} onChange={setName} placeholder="Full name" />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="name@example.com"
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="At least 6 characters"
          />
          <div>
            <label className="text-xs font-medium text-slate-500">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:bg-white"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
          {formError && <p className="text-xs text-rose-600">{formError}</p>}
          <button
            type="submit"
            disabled={saving || !name.trim() || !email.trim() || password.length < 6}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-linear-to-r from-brand-600 to-brand-700 px-3 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-600/20 transition hover:from-brand-500 hover:to-brand-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none"
          >
            <UserPlus size={16} /> {saving ? 'Adding…' : 'Add user'}
          </button>
        </form>
      </SectionCard>
    </div>
  )
}
