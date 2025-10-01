"use client";

export default function TestPage() {
  return (
    <div style={{ 
      background: 'red', 
      color: 'white', 
      padding: '20px', 
      fontSize: '24px',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 9999
    }}>
      <h1>TEST PAGE - If you see this, rendering is working</h1>
      <p>Current time: {new Date().toLocaleTimeString()}</p>
    </div>
  );
}
