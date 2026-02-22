import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'DELETE') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    console.log('Delete all data request received');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Get caller (admin) user ID
    let callerUserId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      try {
        const { data: { user } } = await supabaseAdmin.auth.getUser(token);
        if (user) {
          callerUserId = user.id;
          console.log(`Admin user ID: ${callerUserId}`);
        }
      } catch (e) {
        console.error('Error getting user from token:', e);
      }
    }

    // Get all admin user IDs to preserve
    const { data: adminRoles } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');
    
    const adminUserIds: string[] = adminRoles?.map(r => r.user_id) ?? [];
    if (callerUserId && !adminUserIds.includes(callerUserId)) {
      adminUserIds.push(callerUserId);
    }
    console.log(`Preserving ${adminUserIds.length} admin user(s):`, adminUserIds);

    // Delete tracking events — for each table, delete rows where user_id is NOT an admin
    // We need to handle NULL user_ids too (delete those as well)
    const trackingTables = ['click_events', 'mouse_events', 'scroll_events', 'page_visits'];
    
    for (const table of trackingTables) {
      // Delete rows with null user_id
      const { error: nullError } = await supabaseAdmin
        .from(table)
        .delete()
        .is('user_id', null);
      if (nullError) console.error(`Error deleting null user_id from ${table}:`, nullError);

      // Delete rows with non-admin user_ids
      if (adminUserIds.length > 0) {
        for (const adminId of adminUserIds) {
          // We can't use .not('in') easily, so delete where user_id is not null and not an admin
        }
        // Use a different approach: select all distinct non-admin user_ids then delete
        const { data: rows } = await supabaseAdmin
          .from(table)
          .select('user_id')
          .not('user_id', 'is', null);
        
        const nonAdminUserIds = [...new Set(
          (rows || [])
            .map(r => r.user_id)
            .filter(uid => uid && !adminUserIds.includes(uid))
        )];

        for (const uid of nonAdminUserIds) {
          const { error } = await supabaseAdmin
            .from(table)
            .delete()
            .eq('user_id', uid);
          if (error) console.error(`Error deleting user ${uid} from ${table}:`, error);
        }
      }
      console.log(`Cleaned ${table}`);
    }

    // Delete tracking sessions
    const { error: nullSessionError } = await supabaseAdmin
      .from('tracking_sessions')
      .delete()
      .is('user_id', null);
    if (nullSessionError) console.error('Error deleting null sessions:', nullSessionError);

    if (adminUserIds.length > 0) {
      const { data: sessionRows } = await supabaseAdmin
        .from('tracking_sessions')
        .select('user_id')
        .not('user_id', 'is', null);
      
      const nonAdminSessionUsers = [...new Set(
        (sessionRows || [])
          .map(r => r.user_id)
          .filter(uid => uid && !adminUserIds.includes(uid))
      )];

      for (const uid of nonAdminSessionUsers) {
        await supabaseAdmin.from('tracking_sessions').delete().eq('user_id', uid);
      }
    }
    console.log('Cleaned tracking_sessions');

    // Delete profiles — exclude admins
    if (adminUserIds.length > 0) {
      const { data: profileRows } = await supabaseAdmin
        .from('profiles')
        .select('user_id');
      
      const nonAdminProfiles = (profileRows || [])
        .filter(p => !adminUserIds.includes(p.user_id));

      for (const p of nonAdminProfiles) {
        await supabaseAdmin.from('profiles').delete().eq('user_id', p.user_id);
      }
    } else {
      await supabaseAdmin.from('profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    }
    console.log('Cleaned profiles');

    // Delete auth users — exclude admins
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) {
      console.error('Error listing users:', listError);
    } else if (users?.users) {
      const usersToDelete = users.users.filter(u => !adminUserIds.includes(u.id));
      console.log(`Deleting ${usersToDelete.length} non-admin auth users`);
      for (const user of usersToDelete) {
        const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);
        if (error) console.error(`Error deleting user ${user.id}:`, error);
        else console.log(`Deleted user: ${user.email}`);
      }
    }

    console.log('Deletion completed — admin data preserved');

    return new Response(
      JSON.stringify({ success: true, message: 'All non-admin data deleted successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in delete-all-data:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
