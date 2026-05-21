import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ucfzkzpmvjekgotexriq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjZnprenBtdmpla2dvdGV4cmlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MjM3OTcsImV4cCI6MjA5NDA5OTc5N30.44Q5UUNaUwrAThI1460paHH-FBndlfVRvpjcYR5Q69E';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSizes() {
  const { data: dataVideos, error: errVideos } = await supabase.storage.from('La-locacao').list('vistorias/MNH-K343/videos', {
    limit: 100,
    offset: 0,
    sortBy: { column: 'created_at', order: 'desc' },
  });

  if (errVideos) {
    console.error('Erro vídeos:', errVideos);
  }

  let totalSize = 0;
  console.log(`Arquivos em vistorias/MNH-K343/videos:`);
  if (dataVideos) {
    dataVideos.forEach(file => {
      if (file.name !== '.emptyFolderPlaceholder' && file.metadata) {
        const sizeKB = (file.metadata.size / 1024).toFixed(2);
        const sizeMB = (file.metadata.size / (1024 * 1024)).toFixed(2);
        totalSize += file.metadata.size;
        console.log(`- ${file.name}: ${sizeKB} KB (${sizeMB} MB)`);
      }
    });
  }

  console.log(`\nTamanho Total Vídeos: ${(totalSize / (1024 * 1024)).toFixed(2)} MB`);
}

checkSizes();
