const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://roxoqyegcrhpfzcofltd.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJveG9xeWVnY3JocGZ6Y29mbHRkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODAxODA1NiwiZXhwIjoyMDkzNTk0MDU2fQ.9gcFRp9JzZ1cmrWaTq3Oi1ltvNqYElDMrwdx8-JjPuo';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdmin() {
  const email = 'admin@barbercraft.com';
  const password = 'BarberAdmin2024';

  console.log(`Creating admin user: ${email}...`);

  // 1. Create the user in Auth
  const { data, error } = await supabase.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true
  });

  if (error) {
    if (error.message.includes('already registered')) {
      console.log("Admin user already exists in Auth. Updating profile role...");
      // Get the existing user ID
      const { data: users } = await supabase.auth.admin.listUsers();
      const existingUser = users.users.find(u => u.email === email);
      if (existingUser) {
        await updateProfile(existingUser.id);
      }
    } else {
      console.error("Error creating user:", error.message);
    }
  } else {
    console.log("Admin user created in Auth successfully!");
    await updateProfile(data.user.id);
  }
}

async function updateProfile(uid) {
  // 2. Update the profile to have the admin role
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({ 
      id: uid, 
      email: 'admin@barbercraft.com', 
      name: 'Admin', 
      role: 'admin' 
    });

  if (profileError) {
    console.error("Error updating profile:", profileError.message);
  } else {
    console.log("Admin profile role set successfully!");
  }
}

createAdmin();
