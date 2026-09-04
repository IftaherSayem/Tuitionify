import { Link } from 'react-router-dom';
import {
  Search, UserPlus, ShieldCheck, Star, MapPin, BookOpen,
  GraduationCap, Users, ArrowRight, CheckCircle2,
} from 'lucide-react';
import { SUBJECTS } from '../data/options';

function Fact({ children }) {
  return (
    <li className="flex gap-2 text-sm text-slate-600 dark:text-slate-400">
      <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-brand-600 dark:text-brand-400" />
      <span>{children}</span>
    </li>
  );
}

function Step({ icon: Icon, title, text, n }) {
  return (
    <div className="card relative p-6">
      <span className="absolute -top-3 left-6 flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
        {n}
      </span>
      <Icon className="mt-2 text-brand-600" size={28} />
      <h3 className="mt-3 font-semibold text-slate-900 dark:text-white">{title}</h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{text}</p>
    </div>
  );
}

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 to-slate-50 dark:from-slate-800 dark:to-slate-900">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-24">
          <div>
            <span className="badge">
              <GraduationCap size={14} className="mr-1" /> Built at IIUC, Chittagong
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl dark:text-white">
              Find a <span className="text-brand-600 dark:text-brand-400">tutor</span> nearby, or your next{' '}
              <span className="text-brand-600 dark:text-brand-400">tuition</span>.
            </h1>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
              Guardians post what they need. University students apply to whatever fits around
              their class routine, and the two of you sort out the rest by phone.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/tuitions" className="btn-primary">
                <Search size={18} /> Find Tuitions
              </Link>
              <Link to="/register" className="btn-outline">
                <UserPlus size={18} /> Become a Tutor
              </Link>
            </div>

            <ul className="mt-10 max-w-md space-y-2.5">
              <Fact>Nothing to pay. We don&apos;t take a cut of anyone&apos;s salary.</Fact>
              <Fact>Phone numbers stay hidden until a guardian accepts a tutor.</Fact>
              <Fact>Tutor profiles get checked against a university student ID.</Fact>
            </ul>
          </div>

          {/* Hero card mock */}
          <div className="relative">
            <div className="card space-y-4 p-6 shadow-lg">
              <div className="flex items-center gap-3">
                <img
                  src="https://ui-avatars.com/api/?name=Tanvir+Ahmed&background=0f8f62&color=fff"
                  alt="" className="h-12 w-12 rounded-full object-cover ring-2 ring-brand-100 dark:ring-brand-800"
                />
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Tanvir Ahmed</p>
                  <p className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                    <GraduationCap size={13} /> CSE, IIUC
                  </p>
                </div>
                <span className="ml-auto flex items-center gap-1 text-sm font-medium text-amber-500">
                  <Star size={15} className="fill-amber-400 text-amber-400" /> 4.8
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {['Math', 'Physics', 'ICT'].map((s) => (
                  <span key={s} className="chip">{s}</span>
                ))}
              </div>
              <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1"><MapPin size={15} className="text-slate-400 dark:text-slate-500" /> Khulshi, Chittagong</span>
                <span className="font-semibold text-brand-700 dark:text-brand-400">৳6,000/mo</span>
              </div>
              <button className="btn-primary w-full">View Profile</button>
            </div>
            <div className="absolute -bottom-5 -left-5 hidden rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-md sm:block dark:border-slate-700 dark:bg-slate-800">
              <p className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                <CheckCircle2 size={16} className="text-brand-600" /> ID-checked university tutors
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">How it works</h2>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            Much the same from either side, with one difference: guardians post, tutors apply.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <Step n="1" icon={UserPlus} title="Make a profile"
            text="Email or Google. Tutors fill in their university, subjects, and which areas they can actually travel to." />
          <Step n="2" icon={Search} title="Post, or apply"
            text="A tuition post says the class, subjects, salary and days per week. Tutors filter the board and send an application." />
          <Step n="3" icon={ShieldCheck} title="Pick someone, then talk"
            text="Accepting an applicant swaps phone numbers and closes the post. Leave a rating afterwards so the next guardian has something to go on." />
        </div>
      </section>

      {/* Popular subjects */}
      <section className="bg-white py-16 dark:bg-slate-800/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Popular subjects</h2>
              <p className="mt-2 text-slate-500 dark:text-slate-400">Class 1 up to HSC, O and A Level, and admission prep.</p>
            </div>
            <Link to="/tutors" className="hidden items-center gap-1 text-sm font-semibold text-brand-700 hover:gap-2 sm:flex dark:text-brand-400">
              Browse tutors <ArrowRight size={16} />
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            {SUBJECTS.map((s) => (
              <Link
                key={s}
                to={`/tutors?subject=${encodeURIComponent(s)}`}
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:border-brand-500 dark:hover:bg-brand-900/30 dark:hover:text-brand-400"
              >
                <BookOpen size={15} /> {s}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Two audiences */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="card flex flex-col justify-between bg-gradient-to-br from-brand-600 to-brand-700 p-8 text-white dark:from-brand-700 dark:to-brand-800">
            <div>
              <Users size={32} />
              <h3 className="mt-4 text-2xl font-bold">For Guardians &amp; Students</h3>
              <p className="mt-2 text-brand-50">
                Write down what you need once. The applications come to you, each one showing the
                tutor&apos;s university, subjects and rating before you decide who to call.
              </p>
            </div>
            <Link to="/post-tuition" className="btn mt-6 w-fit bg-white text-brand-700 hover:bg-brand-50">
              Post a Tuition <ArrowRight size={16} />
            </Link>
          </div>
          <div className="card flex flex-col justify-between p-8">
            <div>
              <GraduationCap size={32} className="text-brand-600" />
              <h3 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">For Tutors</h3>
              <p className="mt-2 text-slate-500 dark:text-slate-400">
                Tuition money without going through a coaching centre. Set the areas you can reach
                and the salary you expect, then apply to the posts that fit between classes.
              </p>
            </div>
            <Link to="/register" className="btn-primary mt-6 w-fit">
              Start Tutoring <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
