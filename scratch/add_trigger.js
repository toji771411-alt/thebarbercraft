const { Client } = require('pg');

const sql = `
-- Function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'New User'),
    new.email
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run the function every time a user is created in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also, let's manually insert your current user if it doesn't exist
-- I'll use a broad insert for any existing users in auth.users that are missing from profiles
INSERT INTO public.profiles (id, name, email)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', 'User'), email
FROM auth.users
ON CONFLICT (id) DO NOTHING;
`;

const client = new Client({
  connectionString: "postgresql://postgres:thebarbercraft2016@db.roxoqyegcrhpfzcofltd.supabase.co:5432/postgres"
});

async function run() {
  try {
    await client.connect();
    console.log("Connected to database.");
    await client.query(sql);
    console.log("Auto-profile trigger added and existing users synced!");
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await client.end();
  }
}

run();
