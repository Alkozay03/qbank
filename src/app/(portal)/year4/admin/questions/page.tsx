"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Answer = { text: string; isCorrect: boolean };
type Tag = { type: "SUBJECT"|"SYSTEM"|"TOPIC"|"ROTATION"|"RESOURCE"|"MODE"; value: string };

export default function QuestionBuilderPage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [explanation, setExplanation] = useState("");
  const [objective, setObjective] = useState("");
  const [answers, setAnswers] = useState<Answer[]>([{ text: "", isCorrect: false }]);
  const [refs, setRefs] = useState<string[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  function addAnswer() { setAnswers((x) => [...x, { text: "", isCorrect: false }]); }
  function updateAnswer(idx: number, patch: Partial<Answer>) {
    setAnswers((x) => x.map((a,i) => i===idx ? { ...a, ...patch } : a));
  }
  function removeAnswer(idx: number) { setAnswers((x) => x.filter((_,i)=>i!==idx)); }

  function addRef() { setRefs((x) => [...x, ""]); }
  function updateRef(idx: number, v: string) { setRefs((x) => x.map((r,i)=>i===idx?v:r)); }
  function removeRef(idx: number) { setRefs((x)=>x.filter((_,i)=>i!==idx)); }

  function addTagRow() { setTags((x)=>[...x, { type: "SUBJECT", value: "" }]); }
  function updateTag(idx: number, t: Partial<Tag>) { setTags((x)=>x.map((g,i)=>i===idx?{...g, ...t}:g)); }
  function removeTag(idx: number) { setTags((x)=>x.filter((_,i)=>i!==idx)); }

  async function onAddQuestion() {
    if (!text.trim()) { alert("Enter a question."); return; }
    if (answers.length === 0 || answers.every(a => !a.text.trim())) { alert("Add at least one answer."); return; }
    const payload = { text, explanation, objective, answers, refs, tags };
    const r = await fetch("/api/admin/questions", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(payload)});
    if (r.ok) { alert("Question added!"); reset(); }
    else { const j = await r.json().catch(()=>({})); alert(j?.error || "Failed to add question."); }
  }

  function reset() {
    setText(""); setExplanation(""); setObjective(""); setAnswers([{ text:"", isCorrect:false }]); setRefs([]); setTags([]);
  }

  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#2F6F8F]">Question Builder</h1>
        <button onClick={() => router.push("/year4")} className="rounded-xl border border-[#E6F0F7] bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-[#F3F9FC]">← Year 4 Portal</button>
      </div>

      <div className="rounded-2xl border border-[#E6F0F7] bg-white shadow p-4">
        <div className="mt-2">
          <label className="text-sm font-medium text-slate-700">Question</label>
          <textarea value={text} onChange={(e)=>setText(e.target.value)} rows={4} className="mt-1 w-full rounded-xl border border-[#E6F0F7] px-3 py-2"/>
        </div>

        <div className="mt-4 grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Explanation</label>
            <textarea value={explanation} onChange={(e)=>setExplanation(e.target.value)} rows={5} className="mt-1 w-full rounded-xl border border-[#E6F0F7] px-3 py-2"/>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Educational Objective</label>
            <textarea value={objective} onChange={(e)=>setObjective(e.target.value)} rows={5} className="mt-1 w-full rounded-xl border border-[#E6F0F7] px-3 py-2"/>
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold text-[#2F6F8F]">Answers</div>
            <button onClick={addAnswer} className="rounded-xl border border-[#E6F0F7] px-3 py-2 hover:bg-[#F3F9FC]">+ Add Answer</button>
          </div>
          <div className="mt-2 space-y-2">
            {answers.map((a,idx)=>(
              <div key={idx} className="flex items-center gap-2">
                <input value={a.text} onChange={(e)=>updateAnswer(idx,{ text:e.target.value })} placeholder={`Option ${String.fromCharCode(65+idx)}`} className="flex-1 rounded-xl border border-[#E6F0F7] px-3 py-2"/>
                <label className="text-sm flex items-center gap-1">
                  <input type="checkbox" checked={a.isCorrect} onChange={(e)=>updateAnswer(idx,{ isCorrect: e.target.checked })}/>
                  Correct
                </label>
                <button onClick={()=>removeAnswer(idx)} className="rounded-xl border border-[#E6F0F7] px-3 py-2 text-red-600 hover:bg-red-50">Remove</button>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold text-[#2F6F8F]">References</div>
            <button onClick={addRef} className="rounded-xl border border-[#E6F0F7] px-3 py-2 hover:bg-[#F3F9FC]">+ Add Link</button>
          </div>
          <div className="mt-2 space-y-2">
            {refs.map((r,idx)=>(
              <div key={idx} className="flex items-center gap-2">
                <input value={r} onChange={(e)=>updateRef(idx,e.target.value)} placeholder="https://..." className="flex-1 rounded-xl border border-[#E6F0F7] px-3 py-2"/>
                <button onClick={()=>removeRef(idx)} className="rounded-xl border border-[#E6F0F7] px-3 py-2 text-red-600 hover:bg-red-50">Remove</button>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold text-[#2F6F8F]">Tags</div>
            <button onClick={addTagRow} className="rounded-xl border border-[#E6F0F7] px-3 py-2 hover:bg-[#F3F9FC]">+ Add Tag</button>
          </div>
          <div className="mt-2 space-y-2">
            {tags.map((t,idx)=>(
              <div key={idx} className="grid sm:grid-cols-3 gap-2">
                <select value={t.type} onChange={(e)=>updateTag(idx,{ type: e.target.value as Tag["type"] })} className="rounded-xl border border-[#E6F0F7] px-3 py-2">
                  <option value="SUBJECT">Subject/Discipline</option>
                  <option value="SYSTEM">System</option>
                  <option value="TOPIC">Topic</option>
                  <option value="ROTATION">Rotation</option>
                  <option value="RESOURCE">Resource</option>
                  <option value="MODE">Mode</option>
                </select>
                <input value={t.value} onChange={(e)=>updateTag(idx,{ value: e.target.value })} placeholder="e.g., Pediatrics / Cardiology / UWORLD ..." className="rounded-xl border border-[#E6F0F7] px-3 py-2"/>
                <button onClick={()=>removeTag(idx)} className="rounded-xl border border-[#E6F0F7] px-3 py-2 text-red-600 hover:bg-red-50">Remove</button>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end">
          <button onClick={onAddQuestion} className="rounded-xl bg-[#2F6F8F] px-4 py-2 font-semibold text-white hover:opacity-90">Add Question!</button>
        </div>
      </div>
    </div>
  );
}