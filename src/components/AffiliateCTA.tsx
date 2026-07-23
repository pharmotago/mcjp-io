import React from 'react';

export default function AffiliateCTA() {
  return (
    <div className="glass-panel my-12 p-8 rounded-2xl text-center relative overflow-hidden transition-all duration-300">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-600"></div>
      <h3 className="text-2xl font-bold text-slate-900 mb-3">
        Upgrade Your Home Office Setup
      </h3>
      <p className="text-slate-600 mb-6 max-w-2xl mx-auto">
        If you found this article helpful and are looking for a reliable, high-speed connection for remote work, we highly recommend switching to Superloop NBN.
      </p>
      <a 
        href="https://www.superloop.com/internet/nbn/?referral_code=SLC-1764690" 
        target="_blank" 
        rel="noopener noreferrer"
        className="inline-block bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-700 hover:to-orange-600 text-white font-semibold py-3 px-8 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
      >
        Get Superloop Discount
      </a>
      <p className="text-xs text-slate-400 mt-4">
        *Using this referral link provides a mutual discount on plan fees.
      </p>
    </div>
  );
}
