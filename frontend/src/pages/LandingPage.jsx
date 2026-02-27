import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Upload,
  MessageSquareText,
  Shield,
  Zap,
  Brain,
  FileSearch,
  ChevronDown,
  FileText,
  Twitter,
  Github,
  Linkedin,
  Lock,
  ShieldCheck,
  Eye,
  Server,
  CheckCircle2,
  Star,
} from 'lucide-react';
import '../styles/LandingPage.css';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] },
  }),
};

const features = [
  {
    icon: <FileSearch size={24} />,
    title: 'Deep Document Analysis',
    desc: 'Advanced parsing across PDF, DOCX, TXT, CSV and more. Every page, table, and paragraph is understood.',
  },
  {
    icon: <Brain size={24} />,
    title: 'Contextual Intelligence',
    desc: 'AI that truly comprehends your document — not just keyword matching, but semantic understanding of meaning.',
  },
  {
    icon: <MessageSquareText size={24} />,
    title: 'Natural Conversation',
    desc: 'Ask questions in plain language. Get precise, cited answers with references to specific sections.',
  },
  {
    icon: <Zap size={24} />,
    title: 'Instant Responses',
    desc: 'No waiting. Get answers in seconds, powered by state-of-the-art language models optimized for speed.',
  },
  {
    icon: <Shield size={24} />,
    title: 'Private & Secure',
    desc: 'All your data is fully encrypted at rest and in transit. Only you can access your documents — we never share or sell your data.',
  },
  {
    icon: <Upload size={24} />,
    title: 'Any Format, Any Size',
    desc: 'From single-page memos to 500-page reports. Support for all major document formats up to 50 MB.',
  },
];

const steps = [
  { num: '01', title: 'Upload', desc: 'Drag and drop any document — PDF, Word, text files, spreadsheets, and more.' },
  { num: '02', title: 'Analyze', desc: 'Our AI reads and understands every section, building a comprehensive knowledge map.' },
  { num: '03', title: 'Converse', desc: 'Ask anything. Get intelligent, contextual answers with references.' },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing">
      {/* ===== Hero ===== */}
      <section className="hero">
        <div className="hero__bg">
          <div className="hero__orb hero__orb--1" />
          <div className="hero__orb hero__orb--2" />
          <div className="hero__orb hero__orb--3" />
          <div className="hero__grid" />
        </div>

        <motion.div
          className="hero__badge"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0}
        >
          <span className="hero__badge-dot" />
          Powered by Advanced AI
        </motion.div>

        <motion.h1
          className="hero__title"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={1}
        >
          Your documents,
          <br />
          <em>finally understood</em>
        </motion.h1>

        <motion.p
          className="hero__subtitle"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={2}
        >
          Upload any document and have an intelligent conversation about its contents.
          Get instant answers, summaries, and insights — no more endless scrolling.
        </motion.p>

        <motion.div
          className="hero__actions"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={3}
        >
          <button className="hero__btn-primary" onClick={() => navigate('/workspace')}>
            <span>Start Analyzing</span>
            <ArrowRight size={18} />
          </button>
          <a href="#features" className="hero__btn-secondary">
            See How It Works
            <ChevronDown size={16} />
          </a>
        </motion.div>


      </section>

      {/* ===== Features ===== */}
      <section className="features" id="features">
        <div className="features__header">
          <motion.p
            className="features__label"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
          >
            Capabilities
          </motion.p>
          <motion.h2
            className="features__title"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Everything you need to <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>understand</em>
          </motion.h2>
          <motion.p
            className="features__desc"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Powerful AI tools that transform how you interact with documents
          </motion.p>
        </div>

        <div className="features__grid">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              className="feature-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, delay: i * 0.08 }}
            >
              <p className="feature-card__number">0{i + 1}</p>
              <div className="feature-card__icon">{f.icon}</div>
              <h3 className="feature-card__title">{f.title}</h3>
              <p className="feature-card__desc">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ===== How It Works ===== */}
      <section className="how-it-works" id="how-it-works">
        <div className="how-it-works__header">
          <motion.p
            className="features__label"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
          >
            How It Works
          </motion.p>
          <motion.h2
            className="features__title"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Three steps to <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>clarity</em>
          </motion.h2>
        </div>

        <div className="how-it-works__steps">
          {steps.map((s, i) => (
            <motion.div
              key={s.num}
              className="step-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
            >
              <div className="step-card__number">{s.num}</div>
              <h3 className="step-card__title">{s.title}</h3>
              <p className="step-card__desc">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ===== Trust & Security ===== */}
      <section className="trust" id="trust">
        <div className="trust__inner">
          <div className="trust__header">
            <motion.p
              className="features__label"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.6 }}
            >
              Security & Trust
            </motion.p>
            <motion.h2
              className="features__title"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              Your data is <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>sacred</em> to us
            </motion.h2>
            <motion.p
              className="features__desc"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Enterprise-grade security by default. No compromises, no exceptions.
            </motion.p>
          </div>

          {/* Security pillars */}
          <div className="trust__pillars">
            {[
              {
                icon: <Lock size={22} />,
                title: 'End-to-End Encryption',
                desc: 'AES-256 encryption at rest, TLS 1.3 in transit. Your documents are encrypted before they ever reach our servers.',
                badge: 'AES-256',
              },
              {
                icon: <Eye size={22} />,
                title: 'Encrypted Storage',
                desc: 'Your data is stored fully encrypted in our database. We never train on, sell, or share your documents. Only you can access your content.',
                badge: 'Encrypted',
              },
              {
                icon: <Server size={22} />,
                title: 'SOC 2 Compliant',
                desc: 'Our infrastructure meets SOC 2 Type II standards with continuous monitoring, audit trails, and access controls.',
                badge: 'SOC 2',
              },
              {
                icon: <ShieldCheck size={22} />,
                title: 'GDPR & CCPA Ready',
                desc: 'Full compliance with global privacy regulations. You own your data — always. Export or delete anytime.',
                badge: 'GDPR',
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                className="trust__pillar"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
              >
                <div className="trust__pillar-top">
                  <div className="trust__pillar-icon">{item.icon}</div>
                  <span className="trust__pillar-badge">{item.badge}</span>
                </div>
                <h3 className="trust__pillar-title">{item.title}</h3>
                <p className="trust__pillar-desc">{item.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Trust metrics bar */}
          <motion.div
            className="trust__metrics"
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, delay: 0.15 }}
          >
            <div className="trust__metric">
              <span className="trust__metric-value">99.9%</span>
              <span className="trust__metric-label">Uptime SLA</span>
            </div>
            <div className="trust__metric-divider" />
            <div className="trust__metric">
              <span className="trust__metric-value">0</span>
              <span className="trust__metric-label">Data Breaches</span>
            </div>
            <div className="trust__metric-divider" />
            <div className="trust__metric">
              <span className="trust__metric-value">50K+</span>
              <span className="trust__metric-label">Documents Analyzed</span>
            </div>
            <div className="trust__metric-divider" />
            <div className="trust__metric">
              <span className="trust__metric-value">2,400+</span>
              <span className="trust__metric-label">Trusted Users</span>
            </div>
          </motion.div>

          {/* Testimonials */}
          <div className="trust__reviews">
            {[
              {
                quote: "We handle sensitive legal documents daily. TrueDocs' encryption-first approach gave us the confidence to integrate AI into our workflow.",
                name: 'Sarah Mitchell',
                role: 'Legal Operations, Vertex Law',
                stars: 5,
              },
              {
                quote: "The encryption standards here rival what we use internally. Our security team approved TrueDocs in under a week — that never happens.",
                name: 'James Okoro',
                role: 'CISO, Meridian Health',
                stars: 5,
              },
              {
                quote: "Finally an AI tool that respects data privacy. I can analyze client reports without worrying about data leaks or compliance issues.",
                name: 'Priya Sharma',
                role: 'Consultant, Deloitte Digital',
                stars: 5,
              },
            ].map((review, i) => (
              <motion.div
                key={review.name}
                className="trust__review"
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.6, delay: i * 0.12 }}
              >
                <div className="trust__review-stars">
                  {Array.from({ length: review.stars }, (_, j) => (
                    <Star key={j} size={14} fill="var(--accent)" stroke="var(--accent)" />
                  ))}
                </div>
                <blockquote className="trust__review-quote">"{review.quote}"</blockquote>
                <div className="trust__review-author">
                  <div className="trust__review-avatar">
                    {review.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="trust__review-name">{review.name}</p>
                    <p className="trust__review-role">{review.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Trust seal bar */}
          <motion.div
            className="trust__seals"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="trust__seal">
              <ShieldCheck size={18} />
              <span>SOC 2 Certified</span>
            </div>
            <div className="trust__seal">
              <Lock size={18} />
              <span>256-bit SSL</span>
            </div>
            <div className="trust__seal">
              <CheckCircle2 size={18} />
              <span>GDPR Compliant</span>
            </div>
            <div className="trust__seal">
              <CheckCircle2 size={18} />
              <span>CCPA Compliant</span>
            </div>
            <div className="trust__seal">
              <Shield size={18} />
              <span>ISO 27001</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="cta-section">
        <motion.div
          className="cta-section__box"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7 }}
        >
          <h2 className="cta-section__title">Ready to unlock your documents?</h2>
          <p className="cta-section__desc">
            Start a conversation with your documents today. No signup required.
          </p>
          <button
            className="hero__btn-primary"
            onClick={() => navigate('/workspace')}
            style={{ position: 'relative' }}
          >
            <span>Upload Your First Document</span>
            <ArrowRight size={18} />
          </button>
        </motion.div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="footer">
        <div className="footer__inner">
          <div className="footer__top">
            <div className="footer__brand">
              <div className="footer__brand-row">
                <div className="footer__brand-logo">
                  <FileText strokeWidth={2.5} />
                </div>
                <span className="footer__brand-name">True<span>Docs</span></span>
              </div>
              <p className="footer__brand-desc">
                Intelligent document understanding powered by advanced AI. Upload, analyze, and converse with any document.
              </p>
            </div>

            <div className="footer__col">
              <h4 className="footer__col-title">Product</h4>
              <div className="footer__links">
                <a href="#features" className="footer__link">Features</a>
                <a href="#how-it-works" className="footer__link">How It Works</a>
                <button className="footer__link" onClick={() => navigate('/workspace')}>Workspace</button>
                <button className="footer__link" onClick={() => navigate('/workspace')}>Upload Document</button>
              </div>
            </div>

            <div className="footer__col">
              <h4 className="footer__col-title">Company</h4>
              <div className="footer__links">
                <a href="#" className="footer__link">About Us</a>
                <a href="#" className="footer__link">Blog</a>
                <a href="#" className="footer__link">Careers</a>
                <a href="#" className="footer__link">Contact</a>
              </div>
            </div>

            <div className="footer__col">
              <h4 className="footer__col-title">Legal</h4>
              <div className="footer__links">
                <button className='footer__link' onClick={() => navigate('/PrivacyPolicy')}>Privacy Policy</button>
                <a href="#" className="footer__link">Terms of Service</a>
                <a href="#" className="footer__link">Cookie Policy</a>
              </div>
            </div>
          </div>

          <div className="footer__bottom">
            <p className="footer__copy">&copy; 2026 <span>TrueDocs</span> — All rights reserved.</p>
            <div className="footer__socials">
              <a href="#" className="footer__social-link" aria-label="Twitter"><Twitter size={16} /></a>
              <a href="#" className="footer__social-link" aria-label="GitHub"><Github size={16} /></a>
              <a href="#" className="footer__social-link" aria-label="LinkedIn"><Linkedin size={16} /></a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
