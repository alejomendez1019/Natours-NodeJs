import axios from 'axios';
import { showAlert } from './alerts';
const stripe = Stripe(
  'pk_test_51MVoNgAu0EOkJj1fAnu8I8XRfQ5gaHFrKdzTfcuDzd9SB1ZZfYoAVmQ3NDYlobKRYklaNlHNZjyxkxFKteZh9Nh700cP5ndttR'
);

export const bookTour = async (tourId) => {
  try {
    const session = await axios(`/api/v1/bookings/checkout-session/${tourId}`);
    // 2) Create checkout form + charge credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
    // 3) Create booking on server
  } catch (err) {
    showAlert('error', err);
  }
  // 1) Get checkout session from API
};
