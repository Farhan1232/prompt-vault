import { useEffect, useState, useCallback, useRef } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import {
  Search, Plus, Star, Pin, Copy, Trash2, Edit3,
  Folder, BarChart3, Zap, Grid, List, Download, Upload,
  ChevronRight, Clock, Sparkles, BookOpen, Link2,
  X, Check, RefreshCw, Eye, History, ArrowLeft,
  SortAsc, Heart
} from 'lucide-react'
import {
  GetPrompts, CreatePrompt, UpdatePrompt, DeletePrompt,
  ToggleFavorite, TogglePin, SetRating, RecordUse, GetPrompt,
  GetCollections, CreateCollection, DeleteCollection,
  GetTags, CreateTag, DeleteTag,
  GetStats, ExportData, ImportData,
  GetVersions, RestoreVersion,
  SaveVariables, RenderPrompt,
  GetChains, CreateChain, DeleteChain
} from '../wailsjs/go/main/App'
import './style.css'

type Prompt = {
  id: number; title: string; content: string; description: string
  collectionId?: number; isFavorite: boolean; isPinned: boolean
  rating: number; useCount: number; lastUsedAt?: string
  modelHint: string; notes: string
  tags: Tag[]; variables: Variable[]
  createdAt: string; updatedAt: string
}
type Collection = { id: number; name: string; description: string; color: string; icon: string; promptCount: number }
type Tag = { id: number; name: string; color: string }
type Variable = { id: number; promptId: number; name: string; defaultValue: string; description: string }
type Stats = { totalPrompts: number; totalCollections: number; totalTags: number; totalUses: number; favoriteCount: number; mostUsedCount: number }
type Version = { id: number; promptId: number; content: string; versionNote: string; createdAt: string }
type Chain = { id: number; name: string; description: string; steps: any[]; createdAt: string }

const COLORS = ['#7C3AED','#06B6D4','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#14B8A6','#F97316','#6366F1']
const ICONS  = ['📁','⚡','🎯','🚀','💡','🧠','🔥','✨','📝','🎨','🛠️','📊']
const MODEL_HINTS = ['GPT-4o','GPT-4','GPT-3.5','Claude 3 Opus','Claude 3 Sonnet','Claude 3 Haiku','Gemini Pro','Llama 3','Mistral']

function formatDate(str: string) {
  try {
    const d = new Date(str), now = new Date(), diff = now.getTime() - d.getTime()
    if (diff < 60000)    return 'just now'
    if (diff < 3600000)  return `${Math.floor(diff/60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`
    if (diff < 604800000)return `${Math.floor(diff/86400000)}d ago`
    return d.toLocaleDateString()
  } catch { return str }
}

function Stars({ rating, onChange }: { rating: number; onChange?: (r: number) => void }) {
  const [hov, setHov] = useState(0)
  return (
    <div className="stars" onMouseLeave={() => setHov(0)}>
      {[1,2,3,4,5].map(i => (
        <span key={i} className={`star ${i<=(hov||rating)?'filled':'empty'}`}
          onMouseEnter={() => onChange && setHov(i)}
          onClick={e => { e.stopPropagation(); onChange?.(i) }}>★</span>
      ))}
    </div>
  )
}

function TagBadge({ tag }: { tag: Tag }) {
  return (
    <span className="tag-badge" style={{ background:tag.color+'22', color:tag.color, border:`1px solid ${tag.color}44` }}>
      #{tag.name}
    </span>
  )
}

export default function App() {
  const [view, setView]                       = useState<'grid'|'list'>('grid')
  const [activeNav, setActiveNav]             = useState<'all'|'favorites'|'pinned'|'analytics'|'chains'>('all')
  const [selectedCollectionId, setSelectedCollectionId] = useState<number|null>(null)
  const [selectedTagIds, setSelectedTagIds]   = useState<number[]>([])
  const [searchQuery, setSearchQuery]         = useState('')
  const [sortBy, setSortBy]                   = useState('updated_at')
  const [sortDir, setSortDir]                 = useState<'ASC'|'DESC'>('DESC')
  const [minRating, setMinRating]             = useState(0)

  const [prompts, setPrompts]         = useState<Prompt[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [tags, setTags]               = useState<Tag[]>([])
  const [stats, setStats]             = useState<Stats|null>(null)
  const [chains, setChains]           = useState<Chain[]>([])
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt|null>(null)
  const [detailTab, setDetailTab]     = useState<'edit'|'vars'|'history'|'notes'>('edit')

  const [showNewPrompt, setShowNewPrompt]           = useState(false)
  const [showEditPrompt, setShowEditPrompt]         = useState(false)
  const [showCollectionModal, setShowCollectionModal] = useState(false)
  const [showRenderModal, setShowRenderModal]       = useState(false)
  const [showImportModal, setShowImportModal]       = useState(false)
  const [showChainModal, setShowChainModal]         = useState(false)

  const [versions, setVersions]       = useState<Version[]>([])
  const [varValues, setVarValues]     = useState<Record<string,string>>({})
  const [renderedText, setRenderedText] = useState('')

  const loadAll = useCallback(async () => {
    const filter: any = { sortBy, sortDir }
    if (searchQuery)           filter.query        = searchQuery
    if (selectedCollectionId)  filter.collectionId = selectedCollectionId
    if (selectedTagIds.length) filter.tagIds       = selectedTagIds
    if (activeNav === 'favorites') filter.isFavorite = true
    if (activeNav === 'pinned')    filter.isPinned   = true
    if (minRating > 0)         filter.minRating    = minRating
    try {
      const [ps, cs, ts, st, ch] = await Promise.all([
        GetPrompts(JSON.stringify(filter)), GetCollections(), GetTags(), GetStats(), GetChains()
      ])
      setPrompts(ps || []); setCollections(cs || []); setTags(ts || [])
      setStats(st); setChains(ch || [])
    } catch (e: any) { toast.error('Load error: ' + e) }
  }, [searchQuery, selectedCollectionId, selectedTagIds, sortBy, sortDir, activeNav, minRating])

  useEffect(() => { loadAll() }, [loadAll])
  useEffect(() => {
    if (selectedPrompt) GetVersions(selectedPrompt.id).then(vs => setVersions(vs || []))
  }, [selectedPrompt?.id])

  const handleCopy = async (p: Prompt) => {
    await RecordUse(p.id)
    navigator.clipboard.writeText(p.content)
    toast.success('Copied to clipboard!')
    loadAll()
  }
  const handleFav  = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation(); await ToggleFavorite(id)
    if (selectedPrompt?.id===id) setSelectedPrompt(prev=>prev?{...prev,isFavorite:!prev.isFavorite}:null)
    loadAll()
  }
  const handlePin  = async (id: number, e: React.MouseEvent) => { e.stopPropagation(); await TogglePin(id); loadAll() }
  const handleDel  = async (id: number) => {
    if (!confirm('Delete this prompt?')) return
    await DeletePrompt(id)
    if (selectedPrompt?.id===id) setSelectedPrompt(null)
    toast.success('Deleted'); loadAll()
  }
  const handleRate = async (id: number, r: number) => {
    await SetRating(id, r)
    if (selectedPrompt?.id===id) setSelectedPrompt(prev=>prev?{...prev,rating:r}:null)
    loadAll()
  }
  const handleExport = async () => {
    const data = await ExportData()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([data],{type:'application/json'}))
    a.download = `prompts-${Date.now()}.json`; a.click()
    toast.success('Exported!')
  }
  const handleRender = async () => {
    if (!selectedPrompt) return
    const result = await RenderPrompt(selectedPrompt.id, varValues)
    setRenderedText(result); setShowRenderModal(true); loadAll()
  }
  const handleRestoreVersion = async (vid: number) => {
    if (!selectedPrompt) return
    await RestoreVersion(selectedPrompt.id, vid)
    toast.success('Restored!')
    const updated = await GetPrompt(selectedPrompt.id)
    setSelectedPrompt(updated)
    GetVersions(selectedPrompt.id).then(vs => setVersions(vs||[]))
  }

  const detectedVars = selectedPrompt
    ? [...new Set(Array.from(selectedPrompt.content.matchAll(/\{\{(\w+)\}\}/g),(m:any)=>m[1] as string))]
    : []

  return (
    <div className="app-layout">
      <Toaster position="bottom-right" toastOptions={{
        style:{ background:'var(--card)', color:'var(--text)', border:'1px solid var(--border)' }
      }}/>

      {/* ── SIDEBAR ─────────────────────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark">
            <div className="logo-icon">✨</div>
            <div>
              <div className="logo-text">PromptVault</div>
              <div className="logo-sub">AI Prompt Manager</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {([
            {key:'all',       icon:<BookOpen size={15}/>, label:'All Prompts',  badge:stats?.totalPrompts},
            {key:'favorites', icon:<Heart    size={15}/>, label:'Favorites',    badge:stats?.favoriteCount},
            {key:'pinned',    icon:<Pin      size={15}/>, label:'Pinned'},
            {key:'chains',    icon:<Link2    size={15}/>, label:'Chains',       badge:chains.length||undefined},
            {key:'analytics', icon:<BarChart3 size={15}/>,label:'Analytics'},
          ] as any[]).map(n=>(
            <button key={n.key} className={`nav-item ${activeNav===n.key?'active':''}`}
              onClick={()=>{setActiveNav(n.key);setSelectedCollectionId(null);setSelectedTagIds([])}}>
              {n.icon}{n.label}
              {n.badge!=null&&n.badge>0&&<span className="nav-badge">{n.badge}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-section">
          <div className="sidebar-section-title">
            Collections
            <button onClick={()=>setShowCollectionModal(true)}><Plus size={13}/></button>
          </div>
          {collections.map(c=>(
            <button key={c.id} className={`collection-item ${selectedCollectionId===c.id?'active':''}`}
              onClick={()=>{setSelectedCollectionId(selectedCollectionId===c.id?null:c.id);setActiveNav('all')}}>
              <span className="collection-dot" style={{background:c.color}}/>
              <span>{c.icon} {c.name}</span>
              <span className="collection-count">{c.promptCount}</span>
            </button>
          ))}

          <div className="sidebar-section-title" style={{marginTop:12}}>
            Tags
            <button onClick={()=>{
              const n=prompt('Tag name:')
              if(n) CreateTag(n, COLORS[Math.floor(Math.random()*COLORS.length)]).then(()=>loadAll())
            }}><Plus size={13}/></button>
          </div>
          <div style={{display:'flex',flexWrap:'wrap',gap:4,padding:'2px 4px'}}>
            {tags.map(t=>(
              <button key={t.id} className={`filter-chip ${selectedTagIds.includes(t.id)?'active':''}`}
                style={{fontSize:'11px',padding:'2px 8px'}}
                onClick={()=>setSelectedTagIds(prev=>prev.includes(t.id)?prev.filter(x=>x!==t.id):[...prev,t.id])}>
                #{t.name}
              </button>
            ))}
          </div>
        </div>

        {stats&&(
          <div className="sidebar-stats">
            <div className="stats-grid">
              <div className="stat-box"><div className="val">{stats.totalPrompts}</div><div className="lbl">Prompts</div></div>
              <div className="stat-box"><div className="val">{stats.totalUses}</div><div className="lbl">Uses</div></div>
              <div className="stat-box"><div className="val">{stats.totalCollections}</div><div className="lbl">Collections</div></div>
              <div className="stat-box"><div className="val">{stats.totalTags}</div><div className="lbl">Tags</div></div>
            </div>
          </div>
        )}
      </aside>

      {/* ── MAIN ────────────────────────────────────────────── */}
      <div className="main">
        {activeNav==='analytics' ? <AnalyticsView stats={stats} prompts={prompts}/> :
         activeNav==='chains'    ? <ChainsView chains={chains} prompts={prompts}
                                      onNew={()=>setShowChainModal(true)}
                                      onDelete={async(id:number)=>{await DeleteChain(id);loadAll()}}/> : (
          <>
            <div className="topbar">
              <div className="search-wrap">
                <Search size={15} className="search-icon"/>
                <input placeholder="Search prompts, content, descriptions…" value={searchQuery}
                  onChange={e=>setSearchQuery(e.target.value)}/>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={handleExport}><Download size={14}/>Export</button>
              <button className="btn btn-ghost btn-sm" onClick={()=>setShowImportModal(true)}><Upload size={14}/>Import</button>
              <button className="btn btn-primary" onClick={()=>setShowNewPrompt(true)}><Plus size={15}/>New Prompt</button>
            </div>

            <div className="filter-bar">
              {[0,1,2,3,4,5].map(r=>(
                <button key={r} className={`filter-chip ${minRating===r?'active':''}`} onClick={()=>setMinRating(r)}>
                  {r===0?'All Ratings':`${r}★+`}
                </button>
              ))}
              <div style={{marginLeft:'auto',display:'flex',gap:8,alignItems:'center'}}>
                <select className="sort-select" value={sortBy} onChange={e=>setSortBy(e.target.value)}>
                  <option value="updated_at">Recently Updated</option>
                  <option value="created_at">Date Created</option>
                  <option value="title">Alphabetical</option>
                  <option value="use_count">Most Used</option>
                  <option value="rating">Highest Rated</option>
                </select>
                <button className="btn btn-icon" onClick={()=>setSortDir(d=>d==='DESC'?'ASC':'DESC')} title={sortDir}>
                  <SortAsc size={14} style={{transform:sortDir==='ASC'?'none':'scaleY(-1)'}}/>
                </button>
                <div className="view-toggle">
                  <button className={`view-btn ${view==='grid'?'active':''}`} onClick={()=>setView('grid')}><Grid size={14}/></button>
                  <button className={`view-btn ${view==='list'?'active':''}`} onClick={()=>setView('list')}><List size={14}/></button>
                </div>
              </div>
            </div>

            <div style={{display:'flex',flex:1,minHeight:0}}>
              <div className="prompts-container">
                {prompts.length===0 ? (
                  <div className="empty-state">
                    <div className="empty-icon"><Sparkles size={28}/></div>
                    <h3>No prompts yet</h3>
                    <p>Create your first prompt to start building your AI prompt library.</p>
                    <button className="btn btn-primary" style={{marginTop:16}} onClick={()=>setShowNewPrompt(true)}>
                      <Plus size={15}/>Create Prompt
                    </button>
                  </div>
                ):(
                  <div className={view==='grid'?'prompts-grid':'prompts-list'}>
                    {prompts.map(p=>view==='grid'
                      ? <GridCard key={p.id} prompt={p} selected={selectedPrompt?.id===p.id}
                          onClick={()=>{setSelectedPrompt(p);setDetailTab('edit');setVarValues({})}}
                          onCopy={handleCopy} onFav={handleFav} onPin={handlePin}
                          onDelete={handleDel} onRate={handleRate}/>
                      : <ListCard key={p.id} prompt={p} selected={selectedPrompt?.id===p.id}
                          onClick={()=>{setSelectedPrompt(p);setDetailTab('edit');setVarValues({})}}
                          onCopy={handleCopy} onFav={handleFav} onDelete={handleDel}/>
                    )}
                  </div>
                )}
              </div>

              {selectedPrompt&&(
                <DetailPanel
                  prompt={selectedPrompt} tab={detailTab} onTabChange={setDetailTab}
                  versions={versions} varValues={varValues} onVarChange={setVarValues}
                  detectedVars={detectedVars}
                  onClose={()=>setSelectedPrompt(null)}
                  onEdit={()=>setShowEditPrompt(true)}
                  onCopy={()=>handleCopy(selectedPrompt)}
                  onFav={(e:any)=>handleFav(selectedPrompt.id,e)}
                  onPin={(e:any)=>handlePin(selectedPrompt.id,e)}
                  onDelete={()=>handleDel(selectedPrompt.id)}
                  onRender={handleRender}
                  onRestoreVersion={handleRestoreVersion}
                  onRate={(r:number)=>handleRate(selectedPrompt.id,r)}
                />
              )}
            </div>
          </>
        )}
      </div>

      {/* ── MODALS ──────────────────────────────────────────── */}
      {showNewPrompt&&(
        <PromptModal title="New Prompt" collections={collections} allTags={tags}
          onClose={()=>setShowNewPrompt(false)}
          onSave={async(d:any)=>{
            await CreatePrompt(d.title,d.content,d.description,d.collectionId,d.modelHint,d.notes,d.tagIds)
            setShowNewPrompt(false); loadAll(); toast.success('Prompt created!')
          }}/>
      )}
      {showEditPrompt&&selectedPrompt&&(
        <PromptModal title="Edit Prompt" initial={selectedPrompt} collections={collections} allTags={tags}
          onClose={()=>setShowEditPrompt(false)}
          onSave={async(d:any)=>{
            await UpdatePrompt(selectedPrompt.id,d.title,d.content,d.description,d.collectionId,d.modelHint,d.notes,d.tagIds,'')
            setShowEditPrompt(false)
            const updated=await GetPrompt(selectedPrompt.id)
            setSelectedPrompt(updated); loadAll(); toast.success('Updated!')
          }}/>
      )}
      {showCollectionModal&&(
        <CollectionModal collections={collections} onClose={()=>setShowCollectionModal(false)}
          onCreate={async(n:string,d:string,c:string,i:string)=>{await CreateCollection(n,d,c,i);loadAll();toast.success('Collection created!')}}
          onDelete={async(id:number)=>{await DeleteCollection(id);loadAll();toast.success('Deleted')}}/>
      )}
      {showRenderModal&&<RenderModal text={renderedText} onClose={()=>setShowRenderModal(false)}/>}
      {showImportModal&&(
        <ImportModal onClose={()=>setShowImportModal(false)}
          onImport={async(json:string)=>{await ImportData(json);loadAll();toast.success('Imported!');setShowImportModal(false)}}/>
      )}
      {showChainModal&&(
        <ChainModal prompts={prompts} onClose={()=>setShowChainModal(false)}
          onCreate={async(n:string,d:string,ids:number[])=>{await CreateChain(n,d,ids);loadAll();toast.success('Chain created!');setShowChainModal(false)}}/>
      )}
    </div>
  )
}

/* ── GRID CARD ────────────────────────────────────────────────────────────── */
function GridCard({prompt:p,selected,onClick,onCopy,onFav,onPin,onDelete,onRate}:any){
  return(
    <div className={`prompt-card ${p.isPinned?'pinned':''} ${selected?'selected':''}`} onClick={onClick}>
      <div className="card-header">
        <div className="card-title">
          {p.isPinned&&<Pin size={12} style={{display:'inline',marginRight:4,color:'#F59E0B'}}/>}
          {p.title}
        </div>
        <div className="card-actions" onClick={e=>e.stopPropagation()}>
          <button className={`card-action-btn favorite ${p.isFavorite?'active':''}`} onClick={e=>onFav(p.id,e)}>
            <Heart size={13} fill={p.isFavorite?'#EF4444':'none'} color={p.isFavorite?'#EF4444':'currentColor'}/>
          </button>
          <button className={`card-action-btn ${p.isPinned?'active':''}`} onClick={e=>onPin(p.id,e)}><Pin size={13}/></button>
          <button className="card-action-btn" onClick={()=>onCopy(p)}><Copy size={13}/></button>
          <button className="card-action-btn" style={{color:'var(--danger)'}} onClick={()=>onDelete(p.id)}><Trash2 size={13}/></button>
        </div>
      </div>
      {p.description&&<div className="card-description">{p.description}</div>}
      <div className="card-preview">{p.content}</div>
      {p.tags?.length>0&&<div className="card-tags">{p.tags.slice(0,4).map((t:Tag)=><TagBadge key={t.id} tag={t}/>)}</div>}
      <div className="card-footer">
        <Stars rating={p.rating} onChange={r=>onRate(p.id,r)}/>
        <div className="card-meta">
          {p.modelHint&&<span className="model-chip">{p.modelHint}</span>}
          <span className="meta-item"><Zap size={10}/>{p.useCount}</span>
          <span className="meta-item"><Clock size={10}/>{formatDate(p.updatedAt)}</span>
        </div>
      </div>
    </div>
  )
}

/* ── LIST CARD ────────────────────────────────────────────────────────────── */
function ListCard({prompt:p,selected,onClick,onCopy,onFav,onDelete}:any){
  return(
    <div className={`list-card ${selected?'selected':''}`} onClick={onClick}>
      {p.isPinned&&<Pin size={13} style={{color:'#F59E0B',flexShrink:0}}/>}
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
          <span style={{fontWeight:600,fontSize:14,color:'var(--text)'}}>{p.title}</span>
          {p.tags?.slice(0,3).map((t:Tag)=><TagBadge key={t.id} tag={t}/>)}
          {p.modelHint&&<span className="model-chip">{p.modelHint}</span>}
        </div>
        <div style={{fontSize:12,color:'var(--text-muted)',fontFamily:'var(--mono)',overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>
          {p.content}
        </div>
      </div>
      <Stars rating={p.rating}/>
      <span className="meta-item" style={{fontSize:11}}><Zap size={10}/>{p.useCount}</span>
      <span className="meta-item" style={{fontSize:11}}>{formatDate(p.updatedAt)}</span>
      <div style={{display:'flex',gap:4}} onClick={e=>e.stopPropagation()}>
        <button className="card-action-btn" onClick={e=>onFav(p.id,e)}>
          <Heart size={13} fill={p.isFavorite?'#EF4444':'none'} color={p.isFavorite?'#EF4444':'currentColor'}/>
        </button>
        <button className="card-action-btn" onClick={()=>onCopy(p)}><Copy size={13}/></button>
        <button className="card-action-btn" style={{color:'var(--danger)'}} onClick={()=>onDelete(p.id)}><Trash2 size={13}/></button>
      </div>
    </div>
  )
}

/* ── DETAIL PANEL ─────────────────────────────────────────────────────────── */
function DetailPanel({prompt:p,tab,onTabChange,versions,varValues,onVarChange,detectedVars,onClose,onEdit,onCopy,onFav,onPin,onDelete,onRender,onRestoreVersion,onRate}:any){
  const highlight=(t:string)=>t.replace(/\{\{(\w+)\}\}/g,'<span style="color:var(--accent);font-weight:600">{{$1}}</span>')
  return(
    <div className="detail-panel">
      <div className="detail-header">
        <button className="close-btn" onClick={onClose}><ArrowLeft size={16}/></button>
        <h2>{p.title}</h2>
        <div style={{display:'flex',gap:4,flexShrink:0}}>
          <button className="card-action-btn" onClick={onFav}>
            <Heart size={14} fill={p.isFavorite?'#EF4444':'none'} color={p.isFavorite?'#EF4444':'currentColor'}/>
          </button>
          <button className="card-action-btn" onClick={onPin}><Pin size={14} color={p.isPinned?'#F59E0B':'currentColor'}/></button>
          <button className="btn btn-ghost btn-sm" onClick={onEdit}><Edit3 size={13}/>Edit</button>
          <button className="btn btn-danger btn-sm" onClick={onDelete}><Trash2 size={13}/></button>
        </div>
      </div>

      <div className="tabs" style={{margin:'12px 18px 0'}}>
        {([
          {key:'edit',    label:<><Eye size={12}/> View</>},
          {key:'vars',    label:<>{'{ }'} Variables</>},
          {key:'history', label:<><History size={12}/> History</>},
          {key:'notes',   label:<><Edit3 size={12}/> Notes</>},
        ] as any[]).map(t=>(
          <button key={t.key} className={`tab ${tab===t.key?'active':''}`} onClick={()=>onTabChange(t.key)}>{t.label}</button>
        ))}
      </div>

      <div className="detail-body">
        {tab==='edit'&&(
          <>
            <div style={{marginBottom:12,display:'flex',flexWrap:'wrap',gap:6}}>
              {p.tags?.map((t:Tag)=><TagBadge key={t.id} tag={t}/>)}
              {p.modelHint&&<span className="model-chip">⚡ {p.modelHint}</span>}
            </div>
            {p.description&&<div style={{fontSize:13,color:'var(--text-muted)',marginBottom:12,lineHeight:1.5}}>{p.description}</div>}
            <div className="divider"/>
            <div className="section-heading">Prompt Content</div>
            <div className="render-output" dangerouslySetInnerHTML={{__html:highlight(p.content)}}/>
            <div style={{marginTop:12,display:'flex',alignItems:'center',gap:12}}>
              <Stars rating={p.rating} onChange={onRate}/>
              <span className="meta-item"><Zap size={11}/>{p.useCount} uses</span>
              {p.lastUsedAt&&<span className="meta-item"><Clock size={11}/>{formatDate(p.lastUsedAt)}</span>}
            </div>
          </>
        )}

        {tab==='vars'&&(
          <>
            <div className="section-heading">Fill Variables</div>
            {detectedVars.length===0?(
              <p style={{fontSize:13,color:'var(--text-muted)'}}>
                No <code style={{fontFamily:'var(--mono)',color:'var(--accent)'}}>{'{{variable}}'}</code> found. Add them to your prompt for dynamic substitution.
              </p>
            ):detectedVars.map((v:string)=>(
              <div key={v} className="var-row">
                <span className="var-name">{'{{'+v+'}}'}</span>
                <input className="form-input" style={{padding:'5px 8px',fontSize:12,flex:1}}
                  placeholder={`Value for ${v}`} value={varValues[v]||''}
                  onChange={e=>onVarChange((prev:any)=>({...prev,[v]:e.target.value}))}/>
              </div>
            ))}
            {detectedVars.length>0&&(
              <button className="btn btn-primary btn-sm" style={{width:'100%',marginTop:12}} onClick={onRender}>
                <Sparkles size={13}/>Preview Rendered Prompt
              </button>
            )}
          </>
        )}

        {tab==='history'&&(
          <>
            <div className="section-heading">Version History ({versions.length})</div>
            {versions.length===0?(
              <p style={{fontSize:13,color:'var(--text-muted)'}}>No history yet. Editing and saving creates versions automatically.</p>
            ):versions.map((v:Version)=>(
              <div key={v.id} className="version-item">
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                  <div>
                    <div className="version-note">{v.versionNote}</div>
                    <div className="version-date">{formatDate(v.createdAt)}</div>
                  </div>
                  <button className="btn btn-ghost btn-xs" onClick={()=>onRestoreVersion(v.id)}>
                    <RefreshCw size={11}/>Restore
                  </button>
                </div>
                <div className="version-preview">{v.content}</div>
              </div>
            ))}
          </>
        )}

        {tab==='notes'&&(
          <>
            <div className="section-heading">Notes</div>
            <div style={{fontSize:13,color:p.notes?'var(--text-2)':'var(--text-muted)',lineHeight:1.6,whiteSpace:'pre-wrap'}}>
              {p.notes||'No notes. Click Edit to add notes about this prompt.'}
            </div>
            <div className="divider"/>
            <div className="section-heading">Metadata</div>
            <div style={{fontSize:12,color:'var(--text-muted)',lineHeight:2.2}}>
              <div>Created: {formatDate(p.createdAt)}</div>
              <div>Updated: {formatDate(p.updatedAt)}</div>
              <div>Uses: {p.useCount}</div>
              {p.lastUsedAt&&<div>Last used: {formatDate(p.lastUsedAt)}</div>}
              <div>Variables: {detectedVars.length}</div>
            </div>
          </>
        )}
      </div>

      <div className="detail-footer">
        <button className="btn btn-ghost btn-sm" style={{flex:1}} onClick={onCopy}><Copy size={13}/>Copy</button>
        {detectedVars.length>0&&(
          <button className="btn btn-success btn-sm" style={{flex:1}} onClick={onRender}><Sparkles size={13}/>Render</button>
        )}
      </div>
    </div>
  )
}

/* ── PROMPT MODAL ─────────────────────────────────────────────────────────── */
function PromptModal({title,initial,collections,allTags,onClose,onSave}:any){
  const [d,setD]=useState({
    title:initial?.title||'', content:initial?.content||'',
    description:initial?.description||'', collectionId:initial?.collectionId??undefined,
    modelHint:initial?.modelHint||'', notes:initial?.notes||'',
    tagIds:(initial?.tags||[]).map((t:Tag)=>t.id) as number[]
  })
  const [saving,setSaving]=useState(false)
  const vars=[...new Set(Array.from(d.content.matchAll(/\{\{(\w+)\}\}/g),(m:any)=>m[1] as string))]
  const toggleTag=(id:number)=>setD(p=>({...p,tagIds:p.tagIds.includes(id)?p.tagIds.filter((x:number)=>x!==id):[...p.tagIds,id]}))
  const save=async()=>{
    if(!d.title.trim()||!d.content.trim()){toast.error('Title and content required');return}
    setSaving(true); await onSave(d); setSaving(false)
  }
  return(
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal modal-large">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="close-btn" onClick={onClose}><X size={16}/></button>
        </div>
        <div className="modal-body" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <div>
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input className="form-input" placeholder="Give your prompt a clear name" value={d.title}
                onChange={e=>setD(p=>({...p,title:e.target.value}))} autoFocus/>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input className="form-input" placeholder="What does this prompt do?" value={d.description}
                onChange={e=>setD(p=>({...p,description:e.target.value}))}/>
            </div>
            <div className="form-group">
              <label className="form-label">Collection</label>
              <select className="form-input form-select" value={d.collectionId??''}
                onChange={e=>setD(p=>({...p,collectionId:e.target.value?Number(e.target.value):undefined}))}>
                <option value="">No collection</option>
                {collections.map((c:Collection)=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Target AI Model</label>
              <select className="form-input form-select" value={d.modelHint}
                onChange={e=>setD(p=>({...p,modelHint:e.target.value}))}>
                <option value="">No specific model</option>
                {MODEL_HINTS.map(m=><option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Tags</label>
              <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
                {allTags.map((t:Tag)=>(
                  <button key={t.id} className={`filter-chip ${d.tagIds.includes(t.id)?'active':''}`}
                    style={{fontSize:'11px'}} onClick={()=>toggleTag(t.id)}>#{t.name}</button>
                ))}
                {allTags.length===0&&<span style={{fontSize:12,color:'var(--text-muted)'}}>No tags yet — create some from the sidebar</span>}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-input form-textarea" style={{minHeight:80}} placeholder="Personal notes…" value={d.notes}
                onChange={e=>setD(p=>({...p,notes:e.target.value}))}/>
            </div>
          </div>
          <div style={{display:'flex',flexDirection:'column'}}>
            <div className="form-group" style={{flex:1,display:'flex',flexDirection:'column'}}>
              <label className="form-label" style={{display:'flex',justifyContent:'space-between'}}>
                Prompt Content *
                {vars.length>0&&<span style={{fontSize:11,color:'var(--accent)'}}>{vars.length} variable{vars.length>1?'s':''}</span>}
              </label>
              <textarea className="form-input form-textarea" style={{flex:1,minHeight:280}}
                placeholder={'Write your prompt here…\n\nUse {{variable}} for dynamic values.\n\nExample:\nYou are a {{role}}. Help me with {{task}}.'}
                value={d.content} onChange={e=>setD(p=>({...p,content:e.target.value}))}/>
              {vars.length>0&&(
                <div style={{marginTop:8,padding:'8px 10px',background:'rgba(6,182,212,0.08)',border:'1px solid rgba(6,182,212,0.2)',borderRadius:'var(--radius-sm)'}}>
                  <div style={{fontSize:11,color:'var(--accent)',fontWeight:600,marginBottom:4}}>Variables detected:</div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                    {vars.map(v=><span key={v} style={{fontFamily:'var(--mono)',fontSize:11,background:'rgba(6,182,212,0.15)',color:'var(--accent)',padding:'1px 6px',borderRadius:4}}>{'{{'}{v}{'}}'}</span>)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving?<span className="spinner"/>:<Check size={14}/>}
            {saving?'Saving…':'Save Prompt'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── COLLECTION MODAL ─────────────────────────────────────────────────────── */
function CollectionModal({collections,onClose,onCreate,onDelete}:any){
  const [name,setName]=useState(''), [desc,setDesc]=useState('')
  const [color,setColor]=useState(COLORS[0]), [icon,setIcon]=useState(ICONS[0])
  return(
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="modal-header"><h3>Manage Collections</h3><button className="close-btn" onClick={onClose}><X size={16}/></button></div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Name</label>
            <input className="form-input" placeholder="e.g. Writing, Coding, Research" value={name} onChange={e=>setName(e.target.value)} autoFocus/>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <input className="form-input" placeholder="Optional" value={desc} onChange={e=>setDesc(e.target.value)}/>
          </div>
          <div className="form-group">
            <label className="form-label">Icon</label>
            <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
              {ICONS.map(ic=>(
                <button key={ic} onClick={()=>setIcon(ic)} style={{fontSize:18,background:icon===ic?'var(--surface2)':'transparent',border:`2px solid ${icon===ic?'var(--primary)':'transparent'}`,borderRadius:'var(--radius-sm)',padding:'3px 6px',cursor:'pointer'}}>
                  {ic}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Color</label>
            <div className="color-row">
              {COLORS.map(c=><button key={c} className={`color-swatch ${color===c?'selected':''}`} style={{background:c}} onClick={()=>setColor(c)}/>)}
            </div>
          </div>
          <button className="btn btn-primary btn-sm" disabled={!name.trim()}
            style={{marginBottom:16}} onClick={()=>{onCreate(name,desc,color,icon);setName('');setDesc('')}}>
            <Plus size={13}/>Create
          </button>
          <div className="divider"/>
          <div className="section-heading">Existing</div>
          {collections.map((c:Collection)=>(
            <div key={c.id} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 0',borderBottom:'1px solid var(--border)'}}>
              <span style={{width:10,height:10,borderRadius:'50%',background:c.color,flexShrink:0}}/>
              <span style={{flex:1,fontSize:13}}>{c.icon} {c.name}</span>
              <span style={{fontSize:11,color:'var(--text-muted)'}}>{c.promptCount}</span>
              <button className="btn btn-danger btn-xs" onClick={()=>onDelete(c.id)}>✕</button>
            </div>
          ))}
        </div>
        <div className="modal-footer"><button className="btn btn-ghost" onClick={onClose}>Done</button></div>
      </div>
    </div>
  )
}

/* ── RENDER MODAL ─────────────────────────────────────────────────────────── */
function RenderModal({text,onClose}:{text:string;onClose:()=>void}){
  const copy=()=>{navigator.clipboard.writeText(text);toast.success('Copied!')}
  return(
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="modal-header"><h3><Sparkles size={15} style={{color:'var(--primary)'}}/> Rendered Prompt</h3><button className="close-btn" onClick={onClose}><X size={16}/></button></div>
        <div className="modal-body"><div className="render-output">{text}</div></div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={copy}><Copy size={13}/>Copy</button>
        </div>
      </div>
    </div>
  )
}

/* ── IMPORT MODAL ─────────────────────────────────────────────────────────── */
function ImportModal({onClose,onImport}:any){
  const [json,setJson]=useState('')
  const ref=useRef<HTMLInputElement>(null)
  return(
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="modal-header"><h3><Upload size={15}/>Import Prompts</h3><button className="close-btn" onClick={onClose}><X size={16}/></button></div>
        <div className="modal-body">
          <button className="btn btn-ghost" style={{marginBottom:12}} onClick={()=>ref.current?.click()}><Folder size={14}/>Choose JSON File</button>
          <input type="file" accept=".json" ref={ref} style={{display:'none'}}
            onChange={e=>{const f=e.target.files?.[0];if(f){const r=new FileReader();r.onload=ev=>setJson(ev.target?.result as string);r.readAsText(f)}}}/>
          <textarea className="form-input form-textarea" style={{minHeight:200,fontFamily:'var(--mono)',fontSize:12}}
            placeholder="Or paste JSON here…" value={json} onChange={e=>setJson(e.target.value)}/>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!json.trim()} onClick={()=>onImport(json)}><Upload size={13}/>Import</button>
        </div>
      </div>
    </div>
  )
}

/* ── ANALYTICS VIEW ───────────────────────────────────────────────────────── */
function AnalyticsView({stats,prompts}:{stats:Stats|null;prompts:Prompt[]}){
  const top=[...prompts].sort((a,b)=>b.useCount-a.useCount).slice(0,6)
  const recent=[...prompts].sort((a,b)=>new Date(b.updatedAt).getTime()-new Date(a.updatedAt).getTime()).slice(0,6)
  return(
    <div style={{flex:1,overflow:'auto',padding:24}}>
      <h2 style={{fontSize:20,fontWeight:700,marginBottom:20}} className="gradient-text">Analytics Dashboard</h2>
      {stats&&(
        <div className="analytics-grid">
          <div className="analytic-card"><div className="analytic-val">{stats.totalPrompts}</div><div className="analytic-lbl">Total Prompts</div></div>
          <div className="analytic-card"><div className="analytic-val">{stats.totalUses}</div><div className="analytic-lbl">Total Uses</div></div>
          <div className="analytic-card"><div className="analytic-val">{stats.favoriteCount}</div><div className="analytic-lbl">Favorites</div></div>
          <div className="analytic-card"><div className="analytic-val">{stats.totalCollections}</div><div className="analytic-lbl">Collections</div></div>
          <div className="analytic-card"><div className="analytic-val">{stats.totalTags}</div><div className="analytic-lbl">Tags</div></div>
          <div className="analytic-card"><div className="analytic-val">{stats.mostUsedCount}</div><div className="analytic-lbl">Top Use Count</div></div>
        </div>
      )}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:16}}>
          <div className="section-heading"><Zap size={12} style={{display:'inline',marginRight:4}}/>Most Used</div>
          {top.length===0?<p style={{fontSize:13,color:'var(--text-muted)'}}>No usage data yet.</p>:top.map((p,i)=>(
            <div key={p.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid var(--border)'}}>
              <span style={{fontSize:11,fontWeight:700,color:'var(--text-muted)',width:16}}>#{i+1}</span>
              <span style={{flex:1,fontSize:13,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>{p.title}</span>
              <span style={{fontSize:12,fontWeight:600,color:'var(--primary-l)'}}>{p.useCount}×</span>
            </div>
          ))}
        </div>
        <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:16}}>
          <div className="section-heading"><Clock size={12} style={{display:'inline',marginRight:4}}/>Recently Updated</div>
          {recent.map(p=>(
            <div key={p.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid var(--border)'}}>
              <span style={{flex:1,fontSize:13,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>{p.title}</span>
              <Stars rating={p.rating}/>
              <span style={{fontSize:11,color:'var(--text-muted)'}}>{formatDate(p.updatedAt)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── CHAINS VIEW ──────────────────────────────────────────────────────────── */
function ChainsView({chains,prompts,onNew,onDelete}:any){
  const getP=(id:number)=>prompts.find((p:Prompt)=>p.id===id)
  return(
    <div style={{flex:1,overflow:'auto',padding:24}}>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
        <h2 style={{fontSize:20,fontWeight:700}} className="gradient-text">Prompt Chains</h2>
        <button className="btn btn-primary btn-sm" onClick={onNew}><Plus size={14}/>New Chain</button>
      </div>
      {chains.length===0?(
        <div className="empty-state">
          <div className="empty-icon"><Link2 size={28}/></div>
          <h3>No chains yet</h3>
          <p>Chain multiple prompts together to create multi-step AI workflows.</p>
        </div>
      ):chains.map((c:Chain)=>(
        <div key={c.id} style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:16,marginBottom:12}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
            <h3 style={{flex:1,fontSize:15,fontWeight:600}}><Link2 size={14} style={{display:'inline',marginRight:6,color:'var(--primary)'}}/>{c.name}</h3>
            <span style={{fontSize:11,color:'var(--text-muted)'}}>{formatDate(c.createdAt)}</span>
            <button className="btn btn-danger btn-xs" onClick={()=>onDelete(c.id)}>✕ Delete</button>
          </div>
          {c.description&&<p style={{fontSize:13,color:'var(--text-muted)',marginBottom:12}}>{c.description}</p>}
          <div style={{display:'flex',alignItems:'center',flexWrap:'wrap',gap:4}}>
            {c.steps?.map((s:any,i:number)=>{
              const p=getP(s.promptId)
              return[
                <div key={s.id} style={{background:'var(--bg)',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',padding:'6px 12px',display:'flex',alignItems:'center',gap:6}}>
                  <div style={{width:20,height:20,borderRadius:'50%',background:'linear-gradient(135deg,var(--primary),var(--accent))',color:'#fff',fontSize:10,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{i+1}</div>
                  <span style={{fontSize:12,fontWeight:500}}>{p?.title||'Unknown'}</span>
                </div>,
                i<c.steps.length-1&&<ChevronRight key={`arr-${i}`} size={14} style={{color:'var(--text-muted)'}}/>
              ]
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── CHAIN MODAL ──────────────────────────────────────────────────────────── */
function ChainModal({prompts,onClose,onCreate}:any){
  const [name,setName]=useState(''), [desc,setDesc]=useState(''), [ids,setIds]=useState<number[]>([])
  const toggle=(id:number)=>setIds(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id])
  return(
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="modal-header"><h3><Link2 size={15}/>Create Prompt Chain</h3><button className="close-btn" onClick={onClose}><X size={16}/></button></div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Chain Name</label>
            <input className="form-input" placeholder="e.g. Blog Writing Workflow" value={name} onChange={e=>setName(e.target.value)} autoFocus/>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <input className="form-input" placeholder="What does this chain do?" value={desc} onChange={e=>setDesc(e.target.value)}/>
          </div>
          <div className="form-group">
            <label className="form-label">Select Prompts (click in order)</label>
            <div style={{maxHeight:250,overflow:'auto',display:'flex',flexDirection:'column',gap:5}}>
              {prompts.map((p:Prompt)=>(
                <div key={p.id} onClick={()=>toggle(p.id)} style={{
                  padding:'8px 12px',borderRadius:'var(--radius-sm)',cursor:'pointer',transition:'all 0.15s',
                  background:ids.includes(p.id)?'rgba(124,58,237,0.15)':'var(--bg)',
                  border:`1px solid ${ids.includes(p.id)?'var(--primary)':'var(--border)'}`,
                  display:'flex',alignItems:'center',gap:8
                }}>
                  {ids.includes(p.id)&&(
                    <span style={{width:20,height:20,borderRadius:'50%',background:'var(--primary)',color:'#fff',fontSize:11,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center'}}>
                      {ids.indexOf(p.id)+1}
                    </span>
                  )}
                  <span style={{fontSize:13,flex:1}}>{p.title}</span>
                  {p.tags?.slice(0,2).map((t:Tag)=><TagBadge key={t.id} tag={t}/>)}
                </div>
              ))}
            </div>
            {ids.length>0&&<p style={{fontSize:12,color:'var(--accent)',marginTop:6}}>{ids.length} prompt{ids.length>1?'s':''} selected</p>}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!name.trim()||ids.length===0} onClick={()=>onCreate(name,desc,ids)}>
            <Link2 size={13}/>Create Chain
          </button>
        </div>
      </div>
    </div>
  )
}
