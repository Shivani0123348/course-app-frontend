import axios from "axios";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BACKEND_URL } from "../utils/utils";
function Buy() {
  const { courseId } = useParams();
  const [loading, setLoading] = useState(false);
  const [course, setCourse] = useState({});
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));
  const token = user?.token;

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchCourse = async () => {
      try {
        const res = await axios.post(
          `${BACKEND_URL}/course/buy/${courseId}`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            withCredentials: true,
          }
        );
        setCourse(res.data.course);
      } catch (err) {
        if (err?.response?.status === 400) {
          setError("You have already purchased this course.");
          navigate("/purchases");
        } else {
          setError("Error loading course data.");
        }
      }
    };

    fetchCourse();
  }, [courseId, token]);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    setLoading(true);
    const scriptLoaded = await loadRazorpayScript();

    if (!scriptLoaded) {
      toast.error("Failed to load Razorpay SDK.");
      setLoading(false);
      return;
    }

    try {
      const orderResponse = await axios.post(
        `${BACKEND_URL}/course/buy/${courseId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          withCredentials: true,
        }
      );

      const { id: order_id, amount, currency, key, course } = orderResponse.data;

      const options = {
        key: key, // Razorpay public key from backend
        amount: amount.toString(),
        currency,
        name: "FL-Med",
        description: course.title,
        order_id,
        handler: async function (response) {
          const paymentData = {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            courseId: courseId,
            userId: user?.user?._id,
          };

          try {
            await axios.post(
              `${BACKEND_URL}/course/verify-payment`,
              paymentData,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );
            toast.success("Payment Successful");
            navigate("/purchases");
          } catch (error) {
            console.error("Verification failed", error);
            toast.error("Payment verification failed");
          }
        },
        prefill: {
          name: user?.user?.firstName,
          email: user?.user?.email,
        },
        theme: {
          color: "#6366F1",
        },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (err) {
      toast.error("Payment initiation failed");
    }

    setLoading(false);
  };

  return (
    <>
      {error ? (
        <div className="flex justify-center items-center h-screen">
          <div className="bg-red-100 text-red-700 px-6 py-4 rounded-lg">
            <p className="text-lg font-semibold">{error}</p>
            <Link
              className="w-full bg-orange-500 text-white py-2 rounded-md hover:bg-orange-600 transition duration-200 mt-3 flex items-center justify-center"
              to={"/purchases"}
            >
              Purchases
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row my-40 container mx-auto">
          <div className="w-full md:w-1/2">
            <h1 className="text-xl font-semibold underline">Order Details</h1>
            <div className="flex items-center text-center space-x-2 mt-4">
              <h2 className="text-gray-600 text-sm">Total Price</h2>
              <p className="text-red-500 font-bold">${course.price}</p>
            </div>
            <div className="flex items-center text-center space-x-2">
              <h1 className="text-gray-600 text-sm">Course name</h1>
              <p className="text-red-500 font-bold">{course.title}</p>
            </div>
          </div>
          <div className="w-full md:w-1/2 flex justify-center items-center">
            <div className="bg-white shadow-md rounded-lg p-6 w-full max-w-sm">
              <h2 className="text-lg font-semibold mb-4">
                Process your Payment!
              </h2>
              <button
                onClick={handlePayment}
                disabled={loading}
                className="mt-4 w-full bg-indigo-500 text-white py-2 rounded-md hover:bg-indigo-600 transition duration-200"
              >
                {loading ? "Processing..." : "Pay with Razorpay"}
              </button>
              <button className="w-full bg-orange-500 text-white py-2 rounded-md hover:bg-orange-600 transition duration-200 mt-3 flex items-center justify-center">
                <span className="mr-2">🅿️</span> Other Payments Method
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Buy;
