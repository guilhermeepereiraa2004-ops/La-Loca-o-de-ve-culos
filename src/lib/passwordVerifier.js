// A password check must not sign the main client into a different session.
export async function verifyPasswordWithoutReplacingSession(client, verifierFactory, password) {
  if (typeof password !== 'string' || !password || password.length > 128) return false;
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user?.email) return false;
  const verifier = verifierFactory();
  try {
    const { data, error: signInError } = await verifier.auth.signInWithPassword({ email: user.email, password });
    return !signInError && data?.user?.id === user.id;
  } finally { await verifier.auth.signOut({ scope: 'local' }).catch(() => {}); }
}
