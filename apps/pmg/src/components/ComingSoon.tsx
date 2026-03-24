export default function ComingSoon() {
  return (
    <main className="page">
      <div className="bg" aria-hidden="true">
        <span className="orb orb-1" />
        <span className="orb orb-2" />
        <div className="grid-lines" />
      </div>

      <div className="content">
        <div className="eyebrow">Centurion, Gauteng · South Africa</div>

        <h1 className="wordmark">
          Playhouse<br />
          <em>Media</em><br />
          Group
        </h1>

        <p className="tagline">Building Businesses.<br />One Service at a Time.</p>

        <div className="divider" />

        <p className="body">
          Three specialist divisions. One trusted group.<br />
          We're putting the finishing touches on our new home.
        </p>

        <div className="divisions">
          {[
            "Tender Edge Solutions",
            "Apex Web Solutions",
            "Playhouse Creative Studio",
          ].map((name) => (
            <span key={name} className="division-tag">{name}</span>
          ))}
        </div>

        <a
          href="https://wa.me/27740491433?text=Hi%2C+I+found+Playhouse+Media+Group+online+and+would+like+to+know+more."
          target="_blank"
          rel="noopener noreferrer"
          className="cta"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Get in touch
        </a>

        <div className="footer-row">
          <span className="reg">PMG (PTY) Ltd · CIPC Registered</span>
          <span className="contact">info@playhousemedia.co.za</span>
        </div>
      </div>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --navy:   #0D1B2A;
          --orange: #F97316;
          --white:  #F4F4F2;
          --muted:  rgba(244,244,242,0.5);
          --faint:  rgba(244,244,242,0.15);
        }

        html, body { height: 100%; }

        .page {
          min-height: 100vh;
          background: var(--navy);
          color: var(--white);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 24px;
          position: relative;
          overflow: hidden;
          font-family: 'DM Sans', sans-serif;
        }

        /* ── background ── */
        .bg { position: absolute; inset: 0; pointer-events: none; }

        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.18;
        }
        .orb-1 {
          width: 520px; height: 520px;
          top: -160px; right: -120px;
          background: #F97316;
          animation: drift 12s ease-in-out infinite alternate;
        }
        .orb-2 {
          width: 380px; height: 380px;
          bottom: -100px; left: -80px;
          background: #1E3A5F;
          animation: drift 16s ease-in-out infinite alternate-reverse;
        }
        @keyframes drift {
          from { transform: translate(0, 0) scale(1); }
          to   { transform: translate(30px, 20px) scale(1.06); }
        }

        .grid-lines {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(244,244,242,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(244,244,242,0.03) 1px, transparent 1px);
          background-size: 60px 60px;
        }

        /* ── content ── */
        .content {
          position: relative;
          max-width: 560px;
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 0;
          animation: fadeUp 0.9s ease both;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .eyebrow {
          font-size: 11px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--orange);
          margin-bottom: 24px;
          font-weight: 500;
          animation: fadeUp 0.9s 0.1s ease both;
        }

        .wordmark {
          font-family: 'Playfair Display', serif;
          font-size: clamp(52px, 10vw, 88px);
          font-weight: 400;
          line-height: 0.95;
          letter-spacing: -0.02em;
          margin-bottom: 32px;
          animation: fadeUp 0.9s 0.15s ease both;
        }
        .wordmark em {
          font-style: italic;
          color: var(--orange);
        }

        .tagline {
          font-size: clamp(15px, 2.5vw, 18px);
          color: var(--muted);
          line-height: 1.6;
          font-weight: 300;
          margin-bottom: 32px;
          animation: fadeUp 0.9s 0.2s ease both;
        }

        .divider {
          width: 48px;
          height: 2px;
          background: var(--orange);
          margin-bottom: 28px;
          animation: expand 0.8s 0.4s ease both;
          transform-origin: left;
        }
        @keyframes expand {
          from { transform: scaleX(0); opacity: 0; }
          to   { transform: scaleX(1); opacity: 1; }
        }

        .body {
          font-size: 15px;
          color: var(--muted);
          line-height: 1.7;
          margin-bottom: 32px;
          animation: fadeUp 0.9s 0.25s ease both;
        }

        .divisions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 40px;
          animation: fadeUp 0.9s 0.3s ease both;
        }
        .division-tag {
          font-size: 11px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--faint);
          border: 1px solid var(--faint);
          padding: 5px 10px;
          border-radius: 4px;
          font-weight: 500;
          transition: color 0.2s, border-color 0.2s;
        }
        .division-tag:hover {
          color: var(--white);
          border-color: rgba(244,244,242,0.35);
        }

        .cta {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: #25D366;
          color: #fff;
          text-decoration: none;
          padding: 14px 28px;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 600;
          width: fit-content;
          transition: background 0.2s, transform 0.15s;
          margin-bottom: 40px;
          animation: fadeUp 0.9s 0.35s ease both;
        }
        .cta:hover { background: #20BD5C; transform: translateY(-1px); }
        .cta:active { transform: scale(0.97); }

        .footer-row {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          font-size: 12px;
          color: var(--faint);
          animation: fadeUp 0.9s 0.4s ease both;
        }
        .contact { color: rgba(244,244,242,0.3); }

        @media (max-width: 480px) {
          .wordmark { font-size: 52px; }
          .footer-row { flex-direction: column; gap: 6px; }
        }
      `}</style>
    </main>
  )
}