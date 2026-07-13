import React, { useState, useCallback, useRef } from 'react';
import axios from 'axios';
import './App.css';

// const API = 'http://localhost:8000';
const API = "https://ats-builder-v2.onrender.com";

// ─────────────────────────────────────────────────────────────────────────────
// PDF GENERATOR  (Using html2canvas directly to avoid Blob Worker crashes)
// ─────────────────────────────────────────────────────────────────────────────
async function buildPDF(d, elementRef) {
  if (!elementRef.current) return;
  
  // Dynamically import libraries ONLY when the button is clicked 
  // to prevent browser extensions from crashing the page on refresh
  const html2canvas = (await import('html2canvas')).default;
  const { jsPDF } = await import('jspdf');

  const el = elementRef.current;
  
  // Create a clone to bypass any CSS overflow clipping from the parent container
  const clone = el.cloneNode(true);
  document.body.appendChild(clone);
  
  // Style the clone to be fully visible but off-screen
  clone.style.position = 'absolute';
  clone.style.top = '0';
  clone.style.left = '-9999px';
  clone.style.boxShadow = 'none'; // Prevent shadow in PDF
  clone.style.margin = '0';

  try {
    const canvas = await html2canvas(clone, { scale: 2, logging: false });
    const imgData = canvas.toDataURL('image/jpeg', 1.0);
    const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
    
    // Mathematically scale down to fit ONE A4 page perfectly if content overflows
    const pdfWidth = 595.28;
    const pdfHeight = 841.89;
    const canvasRatio = canvas.height / canvas.width;
    
    let imgWidth = pdfWidth;
    let imgHeight = pdfWidth * canvasRatio;
    
    // If the image is still too tall, scale it down to exactly fit height
    if (imgHeight > pdfHeight) {
      imgHeight = pdfHeight;
      imgWidth = pdfHeight / canvasRatio;
    }

    // Center it horizontally if it scaled down vertically
    const xPos = (pdfWidth - imgWidth) / 2;

    pdf.addImage(imgData, 'JPEG', xPos, 0, imgWidth, imgHeight);

    // Overlay invisible clickable hyperlinks on the PDF
    const links = el.querySelectorAll('a.pdf-link');
    const paperRect = el.getBoundingClientRect();
    links.forEach(link => {
      const linkRect = link.getBoundingClientRect();
      const xRatio = imgWidth / paperRect.width;
      const yRatio = imgHeight / paperRect.height;
      const relX = linkRect.left - paperRect.left;
      const relY = linkRect.top - paperRect.top;
      
      const pdfX = xPos + (relX * xRatio);
      const pdfY = 0 + (relY * yRatio);
      const pdfW = linkRect.width * xRatio;
      const pdfH = linkRect.height * yRatio;
      
      pdf.link(pdfX, pdfY, pdfW, pdfH, { url: link.href });
    });

    pdf.save((d.name || 'resume').replace(/\s+/g, '_') + '_ATS.pdf');
  } catch (error) {
    console.error("PDF generation failed:", error);
  } finally {
    document.body.removeChild(clone);
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// EDITABLE FIELD COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function Field({ label, value, onChange, mono }) {
  return (
    <div className="field">
      {label && <div className="field-lbl">{label}</div>}
      <input
        className={`field-inp${mono ? ' mono' : ''}`}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

function Textarea({ label, value, onChange, rows = 4 }) {
  return (
    <div className="field">
      {label && <div className="field-lbl">{label}</div>}
      <textarea
        className="field-ta"
        value={value || ''}
        rows={rows}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

function Card({ title, children, action }) {
  return (
    <div className="card">
      <div className="card-head">
        <span>{title}</span>
        {action}
      </div>
      {children}
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// FORMATTED TEXT HELPER (Parses **bold** markdown)
// ─────────────────────────────────────────────────────────────────────────────
function FormattedText({ text }) {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ICONS (SVGs)
// ─────────────────────────────────────────────────────────────────────────────
const PhoneIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" style={{marginRight: 4, verticalAlign: '-2px'}}>
    <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/>
  </svg>
);
const EmailIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" style={{marginRight: 4, verticalAlign: '-2px'}}>
    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
  </svg>
);
const LinkedInIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" style={{marginRight: 4, verticalAlign: '-2px'}}>
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
  </svg>
);
const GitHubIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" style={{marginRight: 4, verticalAlign: '-2px'}}>
    <path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5c.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34c-.45-1.15-1.11-1.46-1.11-1.46c-.9-.62.07-.6.07-.6c1 .07 1.53 1.03 1.53 1.03c.87 1.52 2.34 1.07 2.91.83c.09-.65.35-1.09.63-1.34c-2.22-.25-4.55-1.11-4.55-4.92c0-1.11.38-2 1.03-2.71c-.1-.25-.45-1.29.1-2.64c0 0 .84-.27 2.75 1.02c.79-.22 1.65-.33 2.5-.33c.85 0 1.71.11 2.5.33c1.91-1.29 2.75-1.02 2.75-1.02c.55 1.35.2 2.39.1 2.64c.65.71 1.03 1.6 1.03 2.71c0 3.82-2.34 4.66-4.57 4.91c.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z"/>
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// LIVE PREVIEW  (Matches snapshot)
// ─────────────────────────────────────────────────────────────────────────────
function Preview({ data: d, innerRef }) {
  if (!d) return (
    <div className="prev-empty" ref={innerRef}>
      <div className="prev-empty-icon">📄</div>
      <p>Resume preview will appear here</p>
    </div>
  );
  const sk = d.skills || {};
  return (
    <div className="prev-paper" ref={innerRef}>
      <div className="prev-name">{d.name}</div>
      <div className="prev-contact">
        {d.phone && <span className="contact-item"><PhoneIcon /><a className="pdf-link" href={`tel:${d.phone.replace(/[^\d+]/g, '')}`}>{d.phone}</a></span>}
        {d.email && <span className="contact-item"><EmailIcon /><a className="pdf-link" href={`mailto:${d.email}`}>{d.email}</a></span>}
        {d.linkedin && <span className="contact-item"><LinkedInIcon /><a className="pdf-link" href={`https://${d.linkedin.replace(/^https?:\/\//, '')}`} target="_blank" rel="noreferrer">{d.linkedin}</a></span>}
        {d.github && <span className="contact-item"><GitHubIcon /><a className="pdf-link" href={`https://${d.github.replace(/^https?:\/\//, '')}`} target="_blank" rel="noreferrer">{d.github}</a></span>}
      </div>

      {d.experience?.length > 0 && (
        <div className="prev-sec">
          <div className="prev-sec-head">Experience</div>
          {d.experience.map((e, i) => (
            <div key={i} className="prev-entry">
              <div className="prev-entry-row">
                <strong>{e.company}</strong>
                <span className="prev-dates">{e.dates}</span>
              </div>
              <div className="prev-entry-row prev-sub">
                <em>{e.title}</em>
                <em className="prev-loc">{e.location}</em>
              </div>
              <ul className="prev-bullets">
                {(e.bullets || []).map((b, j) => (
                  <li key={j}>
                    <FormattedText text={b} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {(sk.languages || sk.technologies || sk.databases || sk.other) && (
        <div className="prev-sec">
          <div className="prev-sec-head">Technical Skills</div>
          {sk.languages    && <div className="prev-skill"><strong>Languages:</strong> <FormattedText text={sk.languages} /></div>}
          {sk.technologies && <div className="prev-skill"><strong>Technologies:</strong> <FormattedText text={sk.technologies} /></div>}
          {sk.databases    && <div className="prev-skill"><strong>Databases:</strong> <FormattedText text={sk.databases} /></div>}
          {sk.other        && <div className="prev-skill"><strong>Other:</strong> <FormattedText text={sk.other} /></div>}
        </div>
      )}

      {d.projects?.length > 0 && (
        <div className="prev-sec">
          <div className="prev-sec-head">Projects</div>
          {d.projects.map((p, i) => (
            <div key={i} className="prev-entry">
              <div className="prev-entry-row">
                <span><strong>{p.name}</strong> <span style={{margin: '0 4px', fontStyle: 'normal'}}>|</span> <em className="prev-tech">{p.tech}</em></span>
              </div>
              <ul className="prev-bullets">
                {(p.bullets || []).map((b, j) => (
                  <li key={j}><FormattedText text={b} /></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {d.education?.length > 0 && (
        <div className="prev-sec">
          <div className="prev-sec-head">Education</div>
          {d.education.map((e, i) => (
            <div key={i} className="prev-entry">
              <div className="prev-entry-row">
                <strong>{e.school}</strong>
                <span className="prev-dates">{e.dates}</span>
              </div>
              <div className="prev-entry-row prev-sub">
                <em>{e.degree} {e.gpa && `CGPA: ${e.gpa}`}</em>
                <em className="prev-loc">{e.location}</em>
              </div>
              {e.coursework && (
                <div className="prev-course">
                  <strong>* Relevant Coursework:</strong> <FormattedText text={e.coursework} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// ATS SCORE BADGE
// ─────────────────────────────────────────────────────────────────────────────
function ScoreBadge({ score }) {
  const color = score >= 90 ? '#22c55e' : score >= 75 ? '#f59e0b' : '#ef4444';
  return (
    <div className="score-badge" style={{ '--sc': color }}>
      <svg viewBox="0 0 36 36" className="score-ring">
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#2a2d35" strokeWidth="3" />
        <circle
          cx="18" cy="18" r="15.9" fill="none"
          stroke={color} strokeWidth="3"
          strokeDasharray={`${(score / 100) * 100} 100`}
          strokeLinecap="round"
          transform="rotate(-90 18 18)"
        />
      </svg>
      <span className="score-num" style={{ color }}>{score}</span>
      <div className="score-lbl">ATS Score</div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// EDITOR SECTION
// ─────────────────────────────────────────────────────────────────────────────
function Editor({ data, setData }) {
  const upd = useCallback((path, val) => {
    setData(prev => {
      const next  = JSON.parse(JSON.stringify(prev));
      const parts = path.split('.');
      let   obj   = next;
      for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
      obj[parts[parts.length - 1]] = val;
      return next;
    });
  }, [setData]);

  const updBullets = (path, txt) =>
    upd(path, txt.split('\n').filter(l => l.trim()));

  const addExp = () => setData(p => ({
    ...p,
    experience: [...(p.experience || []), {
      company: 'Company', title: 'Title', location: 'City, State',
      dates: 'Month Year – Present', bullets: ['Action verb + impact']
    }]
  }));

  const delExp = i => setData(p => ({
    ...p, experience: p.experience.filter((_, idx) => idx !== i)
  }));

  const addProj = () => setData(p => ({
    ...p,
    projects: [...(p.projects || []), {
      name: 'Project Name', tech: 'Tech Stack', bullets: ['Describe the project']
    }]
  }));

  const delProj = i => setData(p => ({
    ...p, projects: p.projects.filter((_, idx) => idx !== i)
  }));

  return (
    <div className="editor-scroll">

      {/* Contact */}
      <Card title="Contact Information">
        <div className="g2">
          <Field label="Full Name"  value={data.name}     onChange={v => upd('name', v)} />
          <Field label="Phone"      value={data.phone}    onChange={v => upd('phone', v)} />
          <Field label="Email"      value={data.email}    onChange={v => upd('email', v)} />
          <Field label="LinkedIn"   value={data.linkedin} onChange={v => upd('linkedin', v)} />
          <Field label="GitHub"     value={data.github}   onChange={v => upd('github', v)} />
        </div>
      </Card>

      {/* Summary */}
      <Card title="Professional Summary">
        <Textarea value={data.summary} onChange={v => upd('summary', v)} rows={3} />
      </Card>

      {/* Experience */}
      <Card
        title="Work Experience"
        action={<button className="btn-add" onClick={addExp}>+ Add</button>}
      >
        {(data.experience || []).map((e, i) => (
          <div key={i} className="list-item">
            <div className="list-item-hdr">
              <span className="item-num">Experience {i + 1}</span>
              <button className="btn-del" onClick={() => delExp(i)}>Remove</button>
            </div>
            <div className="g2">
              <Field label="Company"  value={e.company}  onChange={v => upd(`experience.${i}.company`, v)} />
              <Field label="Title"    value={e.title}    onChange={v => upd(`experience.${i}.title`, v)} />
              <Field label="Location" value={e.location} onChange={v => upd(`experience.${i}.location`, v)} />
              <Field label="Dates"    value={e.dates}    onChange={v => upd(`experience.${i}.dates`, v)} />
            </div>
            <Textarea
              label="Bullet Points (ek line = ek bullet)"
              value={(e.bullets || []).join('\n')}
              onChange={v => updBullets(`experience.${i}.bullets`, v)}
              rows={6}
            />
          </div>
        ))}
      </Card>

      {/* Skills */}
      <Card title="Technical Skills">
        <Field label="Languages"    value={data.skills?.languages}    onChange={v => upd('skills.languages', v)} />
        <Field label="Technologies" value={data.skills?.technologies} onChange={v => upd('skills.technologies', v)} />
        <Field label="Databases"    value={data.skills?.databases}    onChange={v => upd('skills.databases', v)} />
        <Field label="Other"        value={data.skills?.other}        onChange={v => upd('skills.other', v)} />
      </Card>

      {/* Projects */}
      <Card
        title="Projects (2 required)"
        action={<button className="btn-add" onClick={addProj}>+ Add</button>}
      >
        {(data.projects || []).map((p, i) => (
          <div key={i} className="list-item">
            <div className="list-item-hdr">
              <span className="item-num">Project {i + 1}</span>
              <button className="btn-del" onClick={() => delProj(i)}>Remove</button>
            </div>
            <div className="g2">
              <Field label="Project Name" value={p.name} onChange={v => upd(`projects.${i}.name`, v)} />
              <Field label="Tech Stack"   value={p.tech} onChange={v => upd(`projects.${i}.tech`, v)} />
            </div>
            <Textarea
              label="Bullet Points (5-6 bullets, ek line = ek bullet)"
              value={(p.bullets || []).join('\n')}
              onChange={v => updBullets(`projects.${i}.bullets`, v)}
              rows={5}
            />
          </div>
        ))}
      </Card>

      {/* Education */}
      <Card title="Education">
        {(data.education || []).map((e, i) => (
          <div key={i} className="list-item">
            <div className="list-item-hdr">
              <span className="item-num">Education {i + 1}</span>
            </div>
            <div className="g2">
              <Field label="School"     value={e.school}     onChange={v => upd(`education.${i}.school`, v)} />
              <Field label="Degree"     value={e.degree}     onChange={v => upd(`education.${i}.degree`, v)} />
              <Field label="Dates"      value={e.dates}      onChange={v => upd(`education.${i}.dates`, v)} />
              <Field label="CGPA"       value={e.gpa}        onChange={v => upd(`education.${i}.gpa`, v)} />
              <div className="span2">
                <Field label="Relevant Coursework" value={e.coursework} onChange={v => upd(`education.${i}.coursework`, v)} />
              </div>
            </div>
          </div>
        ))}
      </Card>

    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [step,    setStep]    = useState('input');   // 'input' | 'result'
  const [oldCV,   setOldCV]   = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [data,    setData]    = useState(null);
  const prevRef = useRef(null);

  async function generate() {
    if (!oldCV.trim() || !jobDesc.trim()) {
      setError('Dono fields fill karein.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API}/generate`, {
        old_resume:      oldCV,
        job_description: jobDesc,
      });
      setData(res.data.resume);
      setStep('result');
    } catch (e) {
      setError(e.response?.data?.detail || e.message || 'Kuch galat hua.');
    } finally {
      setLoading(false);
    }
  }

  function copyText() {
    if (!data) return;
    const sk = data.skills || {};
    const lines = [
      data.name,
      [data.phone, data.email, data.linkedin, data.github].filter(Boolean).join(' | '),
      '',
      ...(data.experience?.length ? [
        'EXPERIENCE',
        ...(data.experience.flatMap(e => [
          `${e.company}  |  ${e.title}  |  ${e.dates}  |  ${e.location}`,
          ...(e.bullets || []).map(b => '• ' + b),
          ''
        ]))
      ] : []),
      'TECHNICAL SKILLS',
      sk.languages    ? 'Languages: ' + sk.languages : '',
      sk.technologies ? 'Technologies: ' + sk.technologies : '',
      sk.databases    ? 'Databases: ' + sk.databases : '',
      sk.other        ? 'Other: ' + sk.other : '',
      '',
      ...(data.projects?.length ? [
        'PROJECTS',
        ...(data.projects.flatMap(p => [
          `${p.name}  |  ${p.tech}`,
          ...(p.bullets || []).map(b => '• ' + b),
          ''
        ]))
      ] : []),
      ...(data.education?.length ? [
        'EDUCATION',
        ...(data.education.flatMap(e => [
          `${e.school}  |  ${e.degree}  |  CGPA: ${e.gpa || ''}  |  ${e.dates}`,
          e.coursework ? '• Relevant Coursework: ' + e.coursework : '',
          ''
        ]))
      ] : []),
    ].filter(l => l !== undefined).join('\n');
    navigator.clipboard.writeText(lines);
  }

  // ── INPUT SCREEN ──────────────────────────────────────────────────────────
  if (step === 'input') {
    return (
      <div className="input-screen">
        <div className="input-box">
          <div className="input-logo">
            <span className="logo-badge">ATS</span>
            <h1>Resume Builder <span className="v2">v2</span></h1>
          </div>
          <p className="input-sub">
            Job description paste karo → AI tumhara resume tailor kar dega.<br />
            ATS score 90–100 guaranteed.
          </p>

          <div className="input-pair">
            <div className="input-half">
              <label className="inp-lbl">Purana Resume (plain text)</label>
              <textarea
                className="big-ta"
                placeholder="Copy-paste your existing resume here..."
                value={oldCV}
                onChange={e => setOldCV(e.target.value)}
              />
            </div>
            <div className="input-half">
              <label className="inp-lbl">Job Description</label>
              <textarea
                className="big-ta"
                placeholder="Paste the full job description here..."
                value={jobDesc}
                onChange={e => setJobDesc(e.target.value)}
              />
            </div>
          </div>

          {error && <div className="inp-err">{error}</div>}

          <button
            className="gen-btn"
            onClick={generate}
            disabled={loading}
          >
            {loading
              ? <><span className="spin" /> Generating ATS Resume…</>
              : '✦ Generate ATS Resume'}
          </button>

          {loading && (
            <div className="loading-steps">
              <div className="ls-row"><span className="ls-dot active" />Analyzing job description…</div>
              <div className="ls-row"><span className="ls-dot" />Matching keywords…</div>
              <div className="ls-row"><span className="ls-dot" />Crafting bullet points…</div>
              <div className="ls-row"><span className="ls-dot" />Optimizing ATS score…</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── RESULT SCREEN ─────────────────────────────────────────────────────────
  return (
    <div className="result-screen">

      {/* Top bar */}
      <header className="topbar">
        <div className="topbar-left">
          <button className="back-btn" onClick={() => setStep('input')}>← Back</button>
          <span className="topbar-title">ATS Resume Builder</span>
        </div>
        <div className="topbar-right">
          {data?.ats_score && <ScoreBadge score={data.ats_score} />}
          <button className="tb-btn" onClick={copyText}>📋 Copy Text</button>
          <button className="tb-btn tb-primary" onClick={() => data && buildPDF(data, prevRef)}>
            ⬇ Download PDF
          </button>
        </div>
      </header>

      <div className="result-body">
        {/* Left: Editor */}
        <aside className="editor-panel">
          <div className="panel-head">Editor <span className="editable-tag">editable</span></div>
          {data && <Editor data={data} setData={setData} />}
        </aside>

        {/* Right: Preview */}
        <section className="preview-panel">
          <div className="panel-head">Live Preview</div>
          <Preview data={data} innerRef={prevRef} />
        </section>
      </div>
    </div>
  );
}
