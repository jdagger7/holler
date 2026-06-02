import HollerLogo from '@/components/HollerLogo'

export default function HomePage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      background: 'var(--bg)',
    }}>
      <div style={{ maxWidth: '480px', width: '100%', textAlign: 'center' }}>

        {/* Logo */}
        <div style={{ marginBottom: '20px', width: '100%' }}>
          <HollerLogo variant="full" />
        </div>

        <p className="label" style={{ marginBottom: '40px', letterSpacing: '0.2em' }}>
          Live Song Requests
        </p>

        {/* How it works */}
        <div className="card" style={{ marginBottom: '32px', textAlign: 'left', padding: '24px' }}>
          <p className="label-accent" style={{ marginBottom: '18px' }}>How it works</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              ['Scan the QR code', 'The artist puts up a code at the start of their set.'],
              ['Request a song', 'Search Spotify or type in anything you want to hear.'],
              ['Tip to boost it', 'Add a tip to your request. Others can add to it too.'],
              ['Get your money back', 'If the song does not get played, you are automatically refunded.'],
            ].map(([title, desc]) => (
              <div key={title} style={{ display: 'flex', gap: '14px' }}>
                <span style={{ color: 'var(--accent)', fontFamily: "'Teko', sans-serif", fontSize: '18px', lineHeight: '1.5', flexShrink: 0 }}>✦</span>
                <div>
                  <p style={{ fontFamily: "'Arvo', serif", fontSize: '15px', fontWeight: 700, marginBottom: '3px' }}>{title}</p>
                  <p style={{ fontFamily: "'Arvo', serif", fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.7' }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <a
            href="/signup"
            className="btn-primary"
            style={{ textDecoration: 'none', fontSize: '20px', padding: '16px' }}
          >
            I'm a musician — sign me up →
          </a>
          <a
            href="/dashboard"
            style={{
              display: 'block',
              color: 'var(--text-muted)',
              fontFamily: "'Arvo', serif",
              fontSize: '14px',
              textDecoration: 'none',
              padding: '8px',
            }}
          >
            Already have an account? Sign in
          </a>
        </div>

      </div>
    </div>
  )
}
