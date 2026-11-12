import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { FilePlus, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadReviewerMaterial, getReviewerMaterials } from "@/lib/reviewer-materials.functions";
import { MATERIAL_BLOCKER, MATERIAL_COUNT_LIMIT, MATERIAL_FILE_LIMIT, materialBytes, type ReviewerMaterialsDraft, type SubmittedMaterials } from "@/lib/reviewer-materials";

export function ReviewerMaterialsDraftEditor({ draft, onChange, disabled, available, onBusyChange }: { draft: ReviewerMaterialsDraft; onChange: (d: ReviewerMaterialsDraft) => void; disabled: boolean; available: boolean; onBusyChange?: (busy: boolean) => void }) {
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  async function add(files: FileList | null) {
    if (!files) return;
    setError(""); setReading(true); onBusyChange?.(true);
    try {
      if (draft.files.length + files.length > MATERIAL_COUNT_LIMIT) throw new Error("Attach at most 3 files.");
      const added = [];
      for (const file of Array.from(files)) {
        if (file.size > MATERIAL_FILE_LIMIT) throw new Error("Each file must be at most 4 MB.");
        const base64 = await new Promise<string>((resolve,reject) => { const reader = new FileReader(); reader.onload = () => typeof reader.result === "string" ? resolve(reader.result.split(",")[1] ?? "") : reject(new Error("Could not read file")); reader.onerror = () => reject(new Error("Could not read file")); reader.readAsDataURL(file); });
        const item = { name: file.name, type: file.type as ReviewerMaterialsDraft["files"][number]["type"], base64 };
        materialBytes(item); added.push(item);
      }
      onChange({ ...draft, files: [...draft.files, ...added] });
    } catch(e) { setError(e instanceof Error ? e.message : "Could not add file"); }
    finally { setReading(false); onBusyChange?.(false); }
  }
  return <details className="border-t border-border mt-6 pt-4">
    <summary className="cursor-pointer text-sm font-medium">Supplementary materials for reviewers · optional</summary>
    <div className="mt-3 space-y-3 min-w-0">
      <p className="text-xs text-muted-foreground">Reviewer only · separate from the original AI scoring. Materials are frozen when you submit. Unsent materials are not saved across refresh.</p>
      {!available && <p role="status" className="text-sm text-muted-foreground">{MATERIAL_BLOCKER}</p>}
      <label className="block text-sm">Written note<textarea aria-label="Written note for reviewers" value={draft.note} maxLength={4000} rows={4} disabled={disabled || reading || !available} onChange={e => onChange({ ...draft, note: e.target.value })} className="mt-1 w-full border border-input bg-background p-2" /></label>
      <label className="inline-flex gap-2 items-center text-sm"><FilePlus className="size-4" />PDF, PNG, JPEG or WebP · up to 3 files, 4 MB each<input aria-label="Supplementary reviewer files" type="file" multiple accept="application/pdf,image/png,image/jpeg,image/webp" disabled={disabled || reading || !available} onChange={e => { void add(e.target.files); e.target.value=""; }} className="block min-w-0 max-w-full text-xs" /></label>
      <ul className="space-y-2">{draft.files.map((file,index) => <li key={`${index}-${file.name}`} className="flex min-w-0 items-center gap-2 text-sm"><span className="break-all flex-1">{file.name}</span><Button variant="ghost" size="icon" disabled={disabled || reading} aria-label={`Remove ${file.name}`} onClick={() => onChange({ ...draft, files: draft.files.filter((_,i) => i!==index) })}><X /></Button></li>)}</ul>
      {reading && <p role="status" className="text-xs">Reading files…</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  </details>;
}

export function SubmittedReviewerMaterials({ sessionId }: { sessionId: string }) {
  const read = useServerFn(getReviewerMaterials), download = useServerFn(downloadReviewerMaterial);
  const { data, error } = useQuery({ queryKey:["reviewer-materials",sessionId],queryFn:()=>read({data:{sessionId}}) });
  const [failure,setFailure] = useState(""), [busy,setBusy] = useState(false);
  const materials = data?.materials as SubmittedMaterials | null | undefined;
  if (error) return <p role="alert" className="text-sm text-destructive">Supplementary materials could not be loaded.</p>;
  if (!materials) return null;
  async function save(index:number) {
    if (!materials) return;
    setBusy(true); setFailure("");
    try { const file=await download({data:{sessionId,materialId:materials.id,fileIndex:index}});const bytes=Uint8Array.from(atob(file.base64),c=>c.charCodeAt(0));const url=URL.createObjectURL(new Blob([bytes],{type:file.type}));const link=document.createElement("a");link.href=url;link.download=file.name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000); }
    catch(e) { setFailure(e instanceof Error ? e.message : "Download failed"); }
    finally { setBusy(false); }
  }
  return <section className="border-t border-border pt-4 space-y-3" aria-label="Submitted supplementary materials"><h3 className="text-lg">Supplementary materials for reviewers</h3><p className="text-xs text-muted-foreground">Reviewer only · not included in original AI scoring · submitted {new Date(materials.submitted_at).toLocaleDateString()}</p>{materials.note && <p className="text-sm whitespace-pre-wrap break-words">{materials.note}</p>}<div className="flex flex-wrap gap-2">{materials.files.map((file,index)=><Button key={index} variant="outline" disabled={busy} onClick={()=>void save(index)}><Download className="size-4" /><span className="break-all">{file.name}</span></Button>)}</div>{failure && <p role="alert" className="text-sm text-destructive">{failure}</p>}</section>;
}