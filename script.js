
const supabaseUrl = "https://lcppyuhnlfgnnaqmgnfk.supabase.co";
const supabaseKey = "sb_publishable_4b74e2-5QJLSEzVOHO9hvQ_r5KF0_G2";

const supabaseClient = supabase.createClient(
  supabaseUrl,
  supabaseKey
);

console.log("Supabase client initialized:", supabaseClient);

const trainingDate = document.getElementById("training-date");
const today = new Date();
// const today = new Date(2026, 8, 30);

const dateOptions = {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric"
};

trainingDate.textContent = today.toLocaleDateString(
  "en-US",
  dateOptions
);

// Frost Toes training season
const seasonStart = new Date(2026, 8, 30);
const seasonEnd = new Date(2026, 11, 5);

// Monday = 1, Wednesday = 3, Saturday = 6
const trainingDays = [1, 3, 6];

const currentDate = new Date(
  today.getFullYear(),
  today.getMonth(),
  today.getDate()
);

const isTrainingDay =
  currentDate >= seasonStart &&
  currentDate <= seasonEnd &&
  trainingDays.includes(currentDate.getDay());


const checkInButton = document.querySelector(
  '#checkin-form button'
);

if (!isTrainingDay) {
  trainingDate.textContent +=
    " — No Frost Toes training scheduled today.";

  checkInButton.disabled = true;
}


const form = document.getElementById("checkin-form");
const confirmation = document.getElementById("confirmation");

form.addEventListener("submit", async function(event) {
  event.preventDefault();

  const firstName =
    document.getElementById("firstName").value.trim();

  const lastName =
    document.getElementById("lastName").value.trim();

  const pin =
    document.getElementById("checkinPin").value.trim();

  // Prevent accidental double-click submissions
  checkInButton.disabled = true;
  confirmation.textContent = "Checking you in...";
  // confirmation.textContent = data.message;

  const { data, error } =
    await supabaseClient.functions.invoke("check-in", {
      body: {
        firstName: firstName,
        lastName: lastName,
        pin: pin
      }
    });

  if (error) {
    let message = "Unable to check in. Please try again.";

    if (error.context?.json) {
      try {
        const response = await error.context.json();

        if (response.error) {
          message = response.error;
        }
      } catch {
        // Keep the general error message
      }
    }

    confirmation.textContent = message;
    checkInButton.disabled = false;

    console.error("Check-in error:", error);
    return;
  }

  confirmation.textContent = data.message;

  form.reset();
  checkInButton.disabled = false;
});