export const environment = {
  production: true,
  // These are safe to expose in the browser bundle — Supabase's anon key is
  // designed for client use. Never place the service_role key here.
  supabaseUrl: 'https://YOUR-PROJECT-REF.supabase.co',
  supabaseAnonKey: 'YOUR-SUPABASE-ANON-PUBLIC-KEY',
  cafe: {
    defaultName: 'Madurai Meenakshi Cafe',
    currency: 'INR',
    currencySymbol: '₹',
    timezone: 'Asia/Kolkata',
    dateFormat: 'dd-MM-yyyy'
  }
};
