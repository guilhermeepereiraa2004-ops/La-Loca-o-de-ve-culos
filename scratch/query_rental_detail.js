const supabaseUrl = 'https://ucfzkzpmvjekgotexriq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjZnprenBtdmpla2dvdGV4cmlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MjM3OTcsImV4cCI6MjA5NDA5OTc5N30.44Q5UUNaUwrAThI1460paHH-FBndlfVRvpjcYR5Q69E';

async function run() {
  const res = await fetch(`${supabaseUrl}/rest/v1/rentals?id=eq.da34f7a9-bb0f-4322-b9de-a5a1cb48a5c9`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });
  const data = await res.json();
  console.log(JSON.stringify(data[0], null, 2));
}

run();
