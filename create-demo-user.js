const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://idgnmgrdhgwxmrmujhmv.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);


async function createUser() {
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'demo@archicam.cm',
    password: 'demo1234',
    email_confirm: true
  });

  if (error) {
    console.error('Erreur lors de la création de l\'utilisateur:', error);
  } else {
    console.log('Utilisateur démo créé avec succès:', data.user.email);
  }
}

createUser();
