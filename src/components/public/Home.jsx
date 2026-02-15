import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  Calendar,
  Star,
  MessageCircle,
  Mail,
  ChevronRight,
  UtensilsCrossed,
  Sparkles,
  Quote,
} from 'lucide-react';
import MealCard from './MealCard';
import InfoBar from './InfoBar';

export default function Home({ session }) {
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('');
  const [galleryMeals, setGalleryMeals] = useState([]);
  const [galleryImages, setGalleryImages] = useState([]);
  const [pastMenus, setPastMenus] = useState([]);
  const [approvedFeedback, setApprovedFeedback] = useState([]);
  const [approvedSuggestions, setApprovedSuggestions] = useState([]);

  const [suggestionText, setSuggestionText] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [sendingSuggestion, setSendingSuggestion] = useState(false);

  const [contactMessage, setContactMessage] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [sendingContact, setSendingContact] = useState(false);

  const [registerEmail, setRegisterEmail] = useState('');
  const [registering, setRegistering] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');

  // Only treat as registered (can use suggestions/contact) after email verification (magic link sign-in).
  useEffect(() => {
    if (session?.user?.email) {
      setIsRegistered(true);
      setContactEmail(session.user.email);
      setAwaitingVerification(false);
      window.localStorage?.setItem('lorena_registered_email', session.user.email);
      return;
    }
    const stored = typeof window !== 'undefined' ? window.localStorage?.getItem('lorena_registered_email') : null;
    setIsRegistered(false); // Require verification (session) before allowing suggestions/contact
    if (stored) setContactEmail(stored);
  }, [session?.user?.email]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (event === 'SIGNED_IN' && newSession?.user?.email) {
        const email = newSession.user.email.toLowerCase();
        await supabase.from('registered_emails').upsert(
          { email, verified: true },
          { onConflict: 'email' }
        ).select();
        window.localStorage?.setItem('lorena_registered_email', email);
        setIsRegistered(true);
        setContactEmail(email);
        setAwaitingVerification(false);
        toast.success("Email verified! You can now contact us and make suggestions.");
      }
    });
    return () => subscription?.unsubscribe();
  }, []);

  useEffect(() => {
    fetchCurrentMenu();
    fetchGalleryAndHistory();
    fetchApprovedFeedback();
  }, []);

  const fetchCurrentMenu = async () => {
    try {
      // Try active menu first
      let menu = null;
      const { data: activeMenu } = await supabase
        .from('menus')
        .select('*, meals(*)')
        .eq('status', 'active')
        .order('week_start', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeMenu) {
        menu = activeMenu;
      } else {
        // Fall back to most recent menu
        const { data: menuList } = await supabase
          .from('menus')
          .select('*, meals(*)')
          .order('week_start', { ascending: false })
          .limit(1);
        if (menuList?.[0]) menu = menuList[0];
      }

      if (menu) {
        setMeals(menu.meals || []);
        if (menu.week_start) {
          // Always show Mon-Sun range
          const start = new Date(menu.week_start + 'T00:00:00');
          const end = menu.week_end ? new Date(menu.week_end + 'T00:00:00') : new Date(start.getTime() + 6 * 86400000);
          setDateRange(`${format(start, 'EEEE, MMM d')} – ${format(end, 'EEEE, MMM d')}`);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGalleryAndHistory = async () => {
    try {
      const [menusRes, galleryRes] = await Promise.all([
        supabase.from('menus').select('*, meals(*)').order('week_start', { ascending: false }),
        supabase.from('gallery_images').select('*').order('created_at', { ascending: false }),
      ]);
      const menusData = menusRes?.data || [];
      if (menusData.length) {
        const allMeals = menusData.flatMap((menu) =>
          (menu.meals || []).map((meal) => ({
            ...meal,
            menuDate: menu.week_start,
            week_end: menu.week_end,
          }))
        );
        setGalleryMeals(allMeals.filter((m) => m.title?.trim()));
        setPastMenus(menusData);
      }
      if (galleryRes?.data?.length) setGalleryImages(galleryRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchApprovedFeedback = async () => {
    try {
      const [fbRes, sugRes] = await Promise.all([
        supabase.from('feedback').select('*').eq('status', 'approved').order('created_at', { ascending: false }).then(r => r).catch(() => ({ data: [] })),
        supabase.from('suggestions').select('*').eq('status', 'approved').order('created_at', { ascending: false }).then(r => r).catch(() => ({ data: [] })),
      ]);
      if (fbRes?.data) setApprovedFeedback(fbRes.data);
      if (sugRes?.data) setApprovedSuggestions(sugRes.data);
    } catch {
      // tables may not exist yet
    }
  };

  const handleSubmitMealFeedback = async (mealId, rating, content, userEmailVal, mealTitle, firstName) => {
    if (mealId == null || mealId === undefined) {
      toast.error('This review could not be linked to a meal. Please refresh and try again.');
      return;
    }
    try {
      const { error } = await supabase.from('feedback').insert([
        {
          meal_id: mealId,
          rating,
          content: content?.trim() || null,
          user_email: userEmailVal?.trim() || null,
          first_name: firstName?.trim() || null,
          status: 'pending',
        },
      ]);
      if (error) throw error;
      const mealLabel = mealTitle ? ` for "${mealTitle}"` : '';
      toast.success(`Thank you! Your review${mealLabel} will be reviewed before it appears.`);
    } catch (err) {
      toast.error('Failed to submit feedback.');
    }
  };

  const handleSendSuggestion = async () => {
    if (!suggestionText.trim()) {
      toast.error('Please enter a suggestion');
      return;
    }
    if (!isRegistered) {
      toast.error('Please register your email first.');
      return;
    }
    setSendingSuggestion(true);
    try {
      const { error } = await supabase.from('suggestions').insert([
        { content: suggestionText, user_email: contactEmail || userEmail || null, status: 'new' },
      ]);
      if (error) throw error;
      toast.success("Thanks for your suggestion!");
      setSuggestionText('');
    } catch (err) {
      toast.error('Failed to send suggestion');
    } finally {
      setSendingSuggestion(false);
    }
  };

  const handleRegisterEmail = async () => {
    const email = (registerEmail || '').trim().toLowerCase();
    if (!email) {
      toast.error('Please enter your email');
      return;
    }
    setRegistering(true);
    try {
      // Send a magic-link / OTP email for verification
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: window.location.origin + (window.location.pathname || '') + '#/',
        },
      });
      if (error) throw error;
      setAwaitingVerification(true);
      toast.success('Check your email for a verification link!');
      setRegisterEmail('');
    } catch (err) {
      console.error(err);
      toast.error('Failed to send verification email. Try again.');
    } finally {
      setRegistering(false);
    }
  };

  const handleSendContact = async () => {
    if (!contactMessage.trim()) {
      toast.error('Please enter your message');
      return;
    }
    if (!isRegistered) {
      toast.error('Please register your email first.');
      return;
    }
    setSendingContact(true);
    try {
      const { error } = await supabase.from('suggestions').insert([
        {
          content: `[Contact] ${contactMessage}`,
          user_email: contactEmail || null,
          status: 'new',
        },
      ]);
      if (error) throw error;
      toast.success("Message sent! We'll be in touch.");
      setContactMessage('');
    } catch (err) {
      toast.error('Failed to send message');
    } finally {
      setSendingContact(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-2 border-[#1b4d3e] border-t-transparent rounded-full"
        />
        <p className="mt-4 font-script text-2xl text-[#1b4d3e]">Cooking up the menu...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* ——— HERO ——— */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0f2e26] via-[#1b4d3e] to-[#153a2f] text-white">
        <div className="absolute inset-0 opacity-20">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 sm:px-8 py-16 sm:py-24 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="mb-6"
          >
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6944e802ebbb976a9a2791a1/e01294408_logo_optimized_1000.png"
              alt="Lorena's Home Cooked Meals"
              className="h-40 sm:h-52 md:h-64 w-auto mx-auto object-contain drop-shadow-2xl"
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-6"
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">Weekly meal prep · Delivered with care</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="font-script text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-4"
          >
            Lorena's Home Cooked Meals
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-lg sm:text-xl text-white/90 max-w-xl mx-auto mb-8"
          >
            Freedom From Cravings, Satisfying Addictions.
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/25 rounded-full px-5 py-2.5"
          >
            <Calendar className="w-4 h-4" />
            <span className="text-sm font-semibold uppercase tracking-wider">
              Menu for {dateRange || 'this week'}
            </span>
          </motion.div>
        </div>
      </section>

      {/* ——— THIS WEEK'S MEALS ——— */}
      <section className="max-w-7xl mx-auto px-6 sm:px-8 py-14 sm:py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1b4d3e] mb-2 flex items-center justify-center gap-2">
            <UtensilsCrossed className="w-8 h-8" />
            This Week&apos;s Meals
          </h2>
          <p className="text-stone-500 max-w-lg mx-auto">
            One main dish and two sides per meal, with chef descriptions and nutrition info.
          </p>
        </div>
        {meals.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-start"
          >
            {meals.map((meal, index) => (
              <MealCard
                key={meal.id || index}
                meal={meal}
                index={index}
                approvedFeedback={approvedFeedback.filter((f) => f.meal_id === meal.id)}
                onSubmitFeedback={handleSubmitMealFeedback}
              />
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-16 bg-stone-50 rounded-3xl border border-dashed border-stone-200">
            <UtensilsCrossed className="w-14 h-14 text-stone-300 mx-auto mb-4" />
            <p className="text-stone-500 font-medium">This week's menu is being prepared.</p>
            <p className="text-sm text-stone-400 mt-1">Check back soon or browse past menus below.</p>
          </div>
        )}
      </section>

      {/* ——— PRICING / ORDER INFO ——— */}
      <section className="max-w-7xl mx-auto px-6 sm:px-8 pb-14">
        <InfoBar />
      </section>

      {/* ——— GALLERY STRIP (gallery_images or past meals) ——— */}
      {(galleryImages.length > 0 || galleryMeals.length > 0) && (
        <section className="bg-stone-50 border-y border-stone-100 py-14 sm:py-20">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#1b4d3e] mb-1">From the Kitchen</h2>
            <p className="text-stone-500">A peek at recent creations and portfolio photos.</p>
          </div>
          <div className="overflow-x-auto pb-4 -mx-4 sm:mx-0">
            <div className="flex gap-5 px-6 sm:px-8 min-w-max max-w-7xl mx-auto">
              {galleryImages.length > 0
                ? galleryImages.slice(0, 12).map((img) => (
                    <GalleryStripImage key={img.id} item={img} />
                  ))
                : galleryMeals.slice(0, 12).map((meal, idx) => (
                    <GalleryStripCard key={meal.id || idx} meal={meal} />
                  ))}
            </div>
          </div>
          <div className="max-w-7xl mx-auto px-6 sm:px-8 mt-8 text-center">
            <Link
              to="/gallery"
              className="inline-flex items-center gap-2 text-[#1b4d3e] font-semibold hover:underline"
            >
              View full gallery
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      )}

      {/* ——— HISTORICAL MEAL VIEWER ——— */}
      <section className="max-w-7xl mx-auto px-6 sm:px-8 py-14 sm:py-20">
        <div className="bg-[#1b4d3e] rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2 flex items-center gap-2">
              <Calendar className="w-8 h-8" />
              Past Menus
            </h2>
            <p className="text-white/80 mb-8 max-w-lg">
              Missed a week? Browse our archive of past menus and see what's been on the table.
            </p>
            <div className="flex flex-wrap gap-3 mb-8">
              {pastMenus.slice(0, 8).map((menu) => {
                const start = menu.week_start ? new Date(menu.week_start + 'T00:00:00') : null;
                const end = menu.week_end ? new Date(menu.week_end + 'T00:00:00') : (start ? new Date(start.getTime() + 6 * 86400000) : null);
                return (
                  <span
                    key={menu.id || menu.week_start}
                    className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 text-sm font-medium"
                  >
                    {start && end
                      ? `${format(start, 'EEE, MMM d')} – ${format(end, 'EEE, MMM d')}`
                      : '—'}
                  </span>
                );
              })}
            </div>
            <Link
              to="/gallery"
              className="inline-flex items-center gap-2 bg-white text-[#1b4d3e] font-bold px-6 py-3 rounded-xl hover:bg-white/90 transition-colors"
            >
              View archive
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ——— REGISTER EMAIL (gated with verification) ——— */}
      {!isRegistered && (
        <section className="max-w-7xl mx-auto px-6 sm:px-8 py-14 sm:py-20 w-full flex justify-center">
          <div className="bg-amber-50 border border-amber-100 rounded-3xl p-8 text-center max-w-xl w-full mx-auto">
            {awaitingVerification ? (
              <>
                <Mail className="w-12 h-12 text-[#1b4d3e] mx-auto mb-4" />
                <h2 className="text-xl font-bold text-stone-800 mb-2">Check your email</h2>
                <p className="text-stone-600 text-sm mb-4">
                  We sent a verification link to your email. Click it to complete registration and unlock contact and suggestion features.
                </p>
                <p className="text-xs text-stone-400">
                  Didn't receive it? Check spam, or{' '}
                  <button type="button" onClick={() => setAwaitingVerification(false)} className="text-[#1b4d3e] underline font-medium">
                    try again
                  </button>
                  .
                </p>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold text-stone-800 mb-2">Register your email</h2>
                <p className="text-stone-600 text-sm mb-6">
                  To contact us or make meal suggestions, verify your email below. We'll send a quick verification link.
                </p>
                <input
                  type="email"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRegisterEmail()}
                  placeholder="your@email.com"
                  className="w-full rounded-xl border border-stone-200 px-4 py-3 mb-4 focus:ring-2 focus:ring-[#1b4d3e]/20 focus:border-[#1b4d3e]"
                />
                <button
                  onClick={handleRegisterEmail}
                  disabled={registering}
                  className="w-full bg-[#1b4d3e] text-white font-semibold py-3 rounded-xl hover:bg-[#153a2f] disabled:opacity-50"
                >
                  {registering ? 'Sending verification...' : 'Verify & Register'}
                </button>
              </>
            )}
          </div>
        </section>
      )}

      {/* ——— CONTACT & INQUIRY (gated) ——— */}
      <section className="max-w-7xl mx-auto px-6 sm:px-8 py-14 sm:py-20 w-full flex justify-center">
        <div className="w-full flex justify-center">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-8 w-full max-w-xl">
            <h2 className="text-2xl font-bold text-[#1b4d3e] mb-1 flex items-center gap-2">
              <Mail className="w-6 h-6" />
              Contact & Inquiry
            </h2>
            {!isRegistered ? (
              <p className="text-stone-500 text-sm">
                Register your email above to unlock the contact form.
              </p>
            ) : (
              <>
                <p className="text-stone-500 text-sm mb-6">
                  Reach out for catering, weekly orders, or questions.
                </p>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="Your email"
                  className="w-full rounded-xl border border-stone-200 px-4 py-3 mb-3 focus:ring-2 focus:ring-[#1b4d3e]/20 focus:border-[#1b4d3e]"
                />
                <textarea
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  placeholder="Your message..."
                  rows={4}
                  className="w-full rounded-xl border border-stone-200 px-4 py-3 mb-4 focus:ring-2 focus:ring-[#1b4d3e]/20 focus:border-[#1b4d3e] resize-none"
                />
                <button
                  onClick={handleSendContact}
                  disabled={sendingContact}
                  className="w-full bg-[#1b4d3e] text-white font-semibold py-3 rounded-xl hover:bg-[#153a2f] disabled:opacity-50"
                >
                  {sendingContact ? 'Sending...' : 'Send message'}
                </button>
              </>
            )}
          </div>

          </div>
      </section>

      {/* Approved Feedback / Reviews */}
      {approvedFeedback.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 sm:px-8 py-16">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
            <h2 className="text-3xl font-black text-[#1a3c30] mb-2 text-center">What People Are Saying</h2>
            <p className="text-stone-500 text-center mb-10">Real feedback from our customers</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {approvedFeedback.slice(0, 6).map((fb) => {
                const fbMeal = meals.find((m) => m.id === fb.meal_id);
                const dishImg = fbMeal?.main_img || fbMeal?.image_main || null;
                const dishName = fb.meal_title || fbMeal?.title || null;
                return (
                  <div key={fb.id} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
                    {/* Dish thumbnail + name */}
                    {(dishImg || dishName) && (
                      <div className="flex items-center gap-2.5 mb-3 pb-3 border-b border-stone-100">
                        {dishImg && (
                          <img
                            src={dishImg}
                            alt={dishName || 'Dish'}
                            className="w-10 h-10 rounded-lg object-cover border border-stone-200 flex-shrink-0"
                          />
                        )}
                        {dishName && (
                          <p className="text-xs font-bold text-stone-700 leading-tight">{dishName}</p>
                        )}
                      </div>
                    )}
                    <div className="flex gap-1 mb-3">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} className={`w-5 h-5 ${n <= (fb.rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-stone-200'}`} />
                      ))}
                    </div>
                    {fb.content && <p className="text-stone-700 text-sm italic leading-relaxed mb-3">&ldquo;{fb.content}&rdquo;</p>}
                    <p className="text-xs text-stone-400 font-medium">
                      {fb.first_name || 'A customer'} {fb.created_at && <span>· {new Date(fb.created_at).toLocaleDateString()}</span>}
                    </p>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-stone-200 py-8">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-stone-500">
          <span>© Lorena's Home Cooked Meals</span>
          <Link to="/login" className="text-[#1b4d3e] font-medium hover:underline">
            Admin
          </Link>
        </div>
      </footer>
    </div>
  );
}

function GalleryStripImage({ item }) {
  const url = item.image_url || item.url;
  if (!url) return null;
  return (
    <Link
      to="/gallery"
      className="flex-shrink-0 w-[280px] sm:w-[320px] rounded-2xl overflow-hidden bg-white shadow-md border border-stone-100 group"
    >
      <div className="aspect-[4/3] bg-stone-100 overflow-hidden">
        <img
          src={url}
          alt={item.title || 'Gallery'}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      </div>
      {item.title && (
        <div className="p-4">
          <p className="font-semibold text-stone-800 truncate">{item.title}</p>
          {item.category && <p className="text-xs text-stone-500">{item.category}</p>}
        </div>
      )}
    </Link>
  );
}

function GalleryStripCard({ meal }) {
  const mainImg = meal.image_main ?? meal.main_img;
  const fallbackUrl = mainImg
    ? null
    : `https://image.pollinations.ai/prompt/gourmet%20food%20photography%2C%20${encodeURIComponent(meal.title || 'meal')}?width=400&height=300&nologo=true&model=flux`;
  return (
    <Link
      to="/gallery"
      className="flex-shrink-0 w-[280px] sm:w-[320px] rounded-2xl overflow-hidden bg-white shadow-md border border-stone-100 group"
    >
      <div className="aspect-[4/3] bg-stone-100 overflow-hidden">
        <img
          src={mainImg || fallbackUrl}
          alt={meal.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      </div>
      <div className="p-4">
        <p className="font-semibold text-stone-800 truncate">{meal.title}</p>
        <p className="text-xs text-stone-500">
          {[meal.side, meal.side2].filter(Boolean).join(' · ')}
        </p>
      </div>
    </Link>
  );
}
