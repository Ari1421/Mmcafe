export const environment = {
  production: true,
  // These are safe to expose in the browser bundle — Supabase's anon key is
  // designed for client use. Never place the service_role key here.
  supabaseUrl: 'https://dfaiwwdrjohtlidnknbr.supabase.co',
  supabaseAnonKey: 'sb_publishable_cu6v1wHhTsxvcvN9FgqS_g_BqjL2LNJ',
  cafe: {
    defaultName: 'Madurai Meenakshi Cafe',
    currency: 'INR',
    currencySymbol: '₹',
    timezone: 'Asia/Kolkata',
    dateFormat: 'dd-MM-yyyy'
  }
};
