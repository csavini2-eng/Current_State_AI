import { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { Copy, Layers, Pencil, Plus, Search } from 'lucide-react';
import { useWorkspace } from '@/lib/workspace';
import { blankMilestone, newId, type MilestoneContent, type MilestoneTemplate } from '@/lib/training';
import { Label, Loading, contentOf } from '@/components/shared';
import { MilestoneEditor } from '@/components/milestone-editor';

export function MilestonesPage() {
  const { state, isLoading, save, isSaving, notify } = useWorkspace();
  const [, go] = useLocation();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<string[]>([]);
  const [target, setTarget] = useState('');
  const [editor, setEditor] = useState<{ id?: string; initial: MilestoneContent } | null>(null);
  const list = useMemo(() => state.milestones.filter((m) => m.name.toLowerCase().includes(q.trim().toLowerCase())), [state.milestones, q]);
  if (isLoading) return <Loading />;
  const toggle = (id: string) => setSel((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  const saveTemplate = (content: MilestoneContent) => {
    const id = editor?.id;
    const milestones: MilestoneTemplate[] = id ? state.milestones.map((m) => m.id === id ? { ...content, id } : m) : [...state.milestones, { ...content, id: newId() }];
    return save({ ...state, milestones });
  };
  const duplicate = async (m: MilestoneTemplate) => { if (await save({ ...state, milestones: [...state.milestones, { ...contentOf(m), name: `${m.name} copy`, id: newId() }] })) notify('Milestone duplicated.'); };
  const addToPath = async () => {
    const path = state.paths.find((p) => p.id === target);
    if (!path || !sel.length) return;
    const steps = [...path.steps, ...sel.map((templateId) => ({ id: newId(), templateId, customization: null }))];
    if (await save({ ...state, paths: state.paths.map((p) => p.id === path.id ? { ...p, steps } : p) })) { setSel([]); go(`/journey/${path.id}`); }
  };
  return <main className="main page-enter">
    <header className="top"><div><Label>Reusable skills</Label><h1>Milestone Gallery</h1><p className="lede">Create a skill once, then reuse it in any path.</p></div>
      <button className="btn" onClick={() => setEditor({ initial: blankMilestone() })}><Plus size={16} /> New milestone</button></header>
    <div className="toolbar">
      <div style={{ position: 'relative', flex: 1, minWidth: 200, display: 'flex' }}><input aria-label="Search milestones by name" placeholder="Search milestones by name" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: 1 }} /><Search size={16} style={{ position: 'absolute', right: 14, top: 15, color: 'var(--mute)' }} /></div>
      <select aria-label="Path to add to" value={target} onChange={(e) => setTarget(e.target.value)}><option value="">Choose a path</option>{state.paths.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      <button className="btn btn-soft" disabled={!sel.length || !target || isSaving} onClick={() => void addToPath()}>Add {sel.length || ''} selected to path</button>
    </div>
    {list.length ? <div className="grid-cards">{list.map((m) => {
      const uses = state.paths.filter((p) => p.steps.some((s) => s.templateId === m.id)).length;
      return <article key={m.id} className={`card mile-card ${sel.includes(m.id) ? 'sel' : ''}`}>
        <label className="check"><input type="checkbox" checked={sel.includes(m.id)} onChange={() => toggle(m.id)} /> Select</label>
        <h3>{m.name || 'Untitled skill'}</h3>
        <div><span className="chip">{m.category}</span> <span className="chip">{m.difficulty}</span></div>
        <p>{m.command ? `Cue: “${m.command}”` : 'Cue not added yet'}</p>
        {m.description && <p>{m.description}</p>}
        <p>Used in {uses} {uses === 1 ? 'path' : 'paths'}</p>
        <div className="actions-row" style={{ marginTop: 'auto' }}>
          <button className="btn btn-quiet btn-small" onClick={() => setEditor({ id: m.id, initial: contentOf(m) })}><Pencil size={14} /> Edit</button>
          <button className="btn btn-quiet btn-small" disabled={isSaving} onClick={() => void duplicate(m)}><Copy size={14} /> Duplicate</button>
        </div>
      </article>;
    })}</div> : <div className="empty-state"><Layers size={30} /><h2>{q ? 'No matching milestones' : 'The gallery is empty'}</h2><p>{q ? 'Try a different name.' : 'Create your first reusable skill.'}</p></div>}
    {editor && <MilestoneEditor title={editor.id ? 'Edit milestone' : 'New milestone'} note={editor.id ? 'Changes update every path that uses the original, except paths with their own customized copy.' : undefined} initial={editor.initial} onClose={() => setEditor(null)} onSave={saveTemplate} />}
  </main>;
}
