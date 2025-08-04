// Test utility to debug backend connection issues
export async function testBackendConnection() {
  console.log('🔧 Testing Backend Connection...');
  console.log('=================================');
  
  // Test 1: Check if we're in development mode
  console.log(`1. Environment: ${import.meta.env.DEV ? 'Development' : 'Production'}`);
  console.log(`   Mode: ${import.meta.env.MODE}`);
  console.log(`   Base URL: ${import.meta.env.BASE_URL}`);
  
  // Test 2: Test the proxy endpoint
  try {
    console.log('2. Testing proxy endpoint (/api)...');
    const proxyResponse = await fetch('/api/health', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log(`   Proxy response status: ${proxyResponse.status}`);
    if (proxyResponse.ok) {
      const data = await proxyResponse.json();
      console.log('   ✅ Proxy working!', data);
    } else {
      console.log('   ❌ Proxy failed');
    }
  } catch (error) {
    console.log('   ❌ Proxy error:', error);
  }
  
  // Test 3: Test direct connection (only in production or if proxy fails)
  if (!import.meta.env.DEV) {
    try {
      console.log('3. Testing direct connection...');
      const directResponse = await fetch('http://localhost:8000/api/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
      });
      
      console.log(`   Direct response status: ${directResponse.status}`);
      if (directResponse.ok) {
        const data = await directResponse.json();
        console.log('   ✅ Direct connection working!', data);
      } else {
        console.log('   ❌ Direct connection failed');
      }
    } catch (error) {
      console.log('   ❌ Direct connection error:', error);
    }
  }
  
  // Test 4: Check CORS preflight
  try {
    console.log('4. Testing CORS preflight...');
    const corsResponse = await fetch('/api/health', {
      method: 'OPTIONS',
    });
    console.log(`   CORS preflight status: ${corsResponse.status}`);
    console.log('   CORS headers:', Object.fromEntries(corsResponse.headers.entries()));
  } catch (error) {
    console.log('   ❌ CORS test error:', error);
  }
  
  console.log('=================================');
}

// Call this function from browser console to debug
(window as any).testBackendConnection = testBackendConnection;