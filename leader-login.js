
const supabaseUrl = "https://lcppyuhnlfgnnaqmgnfk.supabase.co";
const supabaseKey = "sb_publishable_4b74e2-5QJLSEzVOHO9hvQ_r5KF0_G2";

const supabaseClient = supabase.createClient(
  supabaseUrl,
  supabaseKey
);

const loginForm = document.getElementById("leader-login-form");
const loginMessage = document.getElementById("login-message");

loginForm.addEventListener("submit", async function(event) {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  loginMessage.textContent = "Signing in...";

  const { data, error } =
    await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password
    });

  if (error) {
    loginMessage.textContent = "Unable to sign in. Check your email and password.";
    console.error("Login error:", error.message);
    return;
  }


  // Check whether this account is an approved leader
  const { data: leader, error: leaderError } =
    await supabaseClient
      .from("leaders")
      .select("user_id")
      .eq("user_id", data.user.id)
      .maybeSingle();

  if (leaderError || !leader) {
    loginMessage.textContent =
      "Leader access could not be verified.";

    await supabaseClient.auth.signOut();
    return;
  }

  loginMessage.textContent =
    "Sign in successful! Leader access confirmed.";
    
  window.location.href = "leader-dashboard.html";
});
