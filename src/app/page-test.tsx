export default function Home() {
  return (
    <div style={{ padding: '20px', backgroundColor: 'white', color: 'black', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Test Page</h1>
      <p>If you can see this, the app is working!</p>
      <a href="/login" style={{ color: 'blue', textDecoration: 'underline' }}>
        Go to Login
      </a>
    </div>
  );
}
