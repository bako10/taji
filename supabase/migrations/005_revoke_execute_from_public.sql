-- Durcissement effectif : les migrations 002/003 révoquaient EXECUTE de `anon`
-- et `authenticated` nommément, mais les fonctions accordent EXECUTE à PUBLIC
-- par défaut, dont anon/authenticated héritent. Il faut révoquer de PUBLIC.

-- Fonctions déclencheurs (triggers) : jamais appelées via l'API REST/RPC.
-- Un trigger s'exécute indépendamment du privilège EXECUTE de l'appelant,
-- on peut donc les rendre inexécutables pour tous les rôles clients.
revoke execute on function public.auto_confirm_email() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- RPC légitime appelée par l'app après connexion : réservée aux utilisateurs signés.
revoke execute on function public.join_with_invite(text) from public, anon;
grant  execute on function public.join_with_invite(text) to authenticated;

-- Helpers utilisés dans les politiques RLS : l'utilisateur qui interroge doit
-- pouvoir les exécuter pendant l'évaluation de la policy, mais anon jamais.
revoke execute on function public.my_org_ids()          from public, anon;
revoke execute on function public.my_member_org_ids()   from public, anon;
revoke execute on function public.my_station_ids()      from public, anon;
revoke execute on function public.station_is_closed(uuid, date) from public, anon;
grant  execute on function public.my_org_ids()          to authenticated;
grant  execute on function public.my_member_org_ids()   to authenticated;
grant  execute on function public.my_station_ids()      to authenticated;
grant  execute on function public.station_is_closed(uuid, date) to authenticated;
