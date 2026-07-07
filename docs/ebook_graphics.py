# -*- coding: utf-8 -*-
"""HTML snippets (mockups + infographics) embedded into the ebook PDF.
Self-contained inline styles, concrete hex colors, emoji instead of icon fonts."""

PHONE_OPEN = '<div style="width:238px;background:#0B2721;border-radius:34px;padding:9px;margin:0 auto;">'
CAP = lambda t: f'<div style="text-align:center;font-size:11px;color:#8a8577;font-style:italic;margin-top:8px;">{t}</div>'

def _fig(inner, cap):
    return f'<figure class="graphic">{inner}{CAP(cap)}</figure>'

# ---------- MOCKUPS ----------

M_GREETING = _fig(PHONE_OPEN + '''
<div style="background:#ECE5DD;border-radius:24px;overflow:hidden;">
  <div style="background:#075E54;color:#fff;padding:8px 12px 10px;display:flex;align-items:center;gap:9px;">
    <div style="width:32px;height:32px;border-radius:50%;background:#25D366;display:flex;align-items:center;justify-content:center;">🦷</div>
    <div><div style="font-size:13px;font-weight:600;">Bright Smile Dental</div><div style="font-size:9px;opacity:.85;">Business account</div></div>
  </div>
  <div style="padding:14px 11px;min-height:150px;">
    <div style="display:flex;justify-content:flex-end;margin-bottom:10px;"><div style="background:#DCF8C6;font-size:12px;line-height:1.4;padding:7px 9px;border-radius:9px 9px 2px 9px;max-width:80%;">Hi, do you have any openings this week?</div></div>
    <div style="display:flex;justify-content:flex-start;"><div style="background:#fff;font-size:12px;line-height:1.45;padding:8px 10px;border-radius:9px 9px 9px 2px;max-width:86%;"><div style="font-size:9px;color:#128C7E;font-weight:600;margin-bottom:3px;">⚡ Automatic reply</div>Hi! 👋 Thanks for contacting Bright Smile Dental. Tell us how we can help — a new appointment, an insurance question, or pricing — and a team member will reply shortly.</div></div>
  </div>
  <div style="background:#F0EFEA;padding:7px 9px;display:flex;align-items:center;gap:7px;"><div style="flex:1;background:#fff;border-radius:16px;padding:6px 11px;font-size:11px;color:#9a958c;">Message</div><div style="width:28px;height:28px;border-radius:50%;background:#075E54;color:#fff;display:flex;align-items:center;justify-content:center;">➤</div></div>
</div></div>''', 'The greeting your customer receives automatically — day or night.')

M_AWAY = _fig(PHONE_OPEN + '''
<div style="background:#ECE5DD;border-radius:24px;overflow:hidden;">
  <div style="background:#075E54;color:#fff;padding:8px 12px 10px;display:flex;align-items:center;gap:9px;">
    <div style="width:32px;height:32px;border-radius:50%;background:#25D366;display:flex;align-items:center;justify-content:center;">🦷</div>
    <div><div style="font-size:13px;font-weight:600;">Bright Smile Dental</div><div style="font-size:9px;opacity:.85;">Business account</div></div>
  </div>
  <div style="padding:14px 11px;min-height:150px;">
    <div style="display:flex;justify-content:flex-end;margin-bottom:10px;"><div style="background:#DCF8C6;font-size:12px;line-height:1.4;padding:7px 9px;border-radius:9px 9px 2px 9px;max-width:80%;">Hi, are you open tomorrow?</div></div>
    <div style="display:flex;justify-content:flex-start;"><div style="background:#fff;font-size:12px;line-height:1.45;padding:8px 10px;border-radius:9px 9px 9px 2px;max-width:86%;"><div style="font-size:9px;color:#128C7E;font-weight:600;margin-bottom:3px;">🌙 Away message</div>Thanks for your message! Our office is currently closed. Hours are Mon–Fri, 8 AM–5 PM. We'll reply first thing when we reopen. For a dental emergency, please call (210) 555-0142.</div></div>
  </div>
  <div style="background:#F0EFEA;padding:7px 9px;display:flex;align-items:center;gap:7px;"><div style="flex:1;background:#fff;border-radius:16px;padding:6px 11px;font-size:11px;color:#9a958c;">Message</div><div style="width:28px;height:28px;border-radius:50%;background:#075E54;color:#fff;display:flex;align-items:center;justify-content:center;">➤</div></div>
</div></div>''', 'Your away message keeps customers informed, even at 10 PM.')

M_QUICK = _fig(PHONE_OPEN + '''
<div style="background:#ECE5DD;border-radius:24px;overflow:hidden;">
  <div style="background:#075E54;color:#fff;padding:8px 12px 10px;display:flex;align-items:center;gap:9px;">
    <div style="width:32px;height:32px;border-radius:50%;background:#25D366;color:#075E54;font-weight:700;display:flex;align-items:center;justify-content:center;font-size:13px;">MR</div>
    <div><div style="font-size:13px;font-weight:600;">Maria Ramirez</div><div style="font-size:9px;opacity:.85;">online</div></div>
  </div>
  <div style="padding:14px 11px;min-height:120px;"><div style="display:flex;justify-content:flex-start;"><div style="background:#fff;font-size:12px;padding:7px 9px;border-radius:9px 9px 9px 2px;">What are your hours?</div></div></div>
  <div style="background:#fff;border-top:.5px solid #e2ded4;">
    <div style="padding:5px 10px;font-size:9px;color:#9a958c;text-transform:uppercase;">Quick replies</div>
    <div style="padding:8px 11px;border-top:.5px solid #eee;"><span style="color:#128C7E;font-weight:700;font-size:11px;">/hours</span> <span style="font-size:10px;color:#5f5a50;">We're open Mon–Fri, 8 AM–5 PM…</span></div>
    <div style="padding:8px 11px;border-top:.5px solid #eee;"><span style="color:#128C7E;font-weight:700;font-size:11px;">/insurance</span> <span style="font-size:10px;color:#5f5a50;">Yes! We accept most major PPO…</span></div>
    <div style="padding:8px 11px;border-top:.5px solid #eee;"><span style="color:#128C7E;font-weight:700;font-size:11px;">/pricing</span> <span style="font-size:10px;color:#5f5a50;">A new-patient exam is $89…</span></div>
  </div>
  <div style="background:#F0EFEA;padding:7px 9px;display:flex;align-items:center;gap:7px;"><div style="flex:1;background:#fff;border-radius:16px;padding:6px 11px;font-size:12px;color:#0B2721;">/</div><div style="width:28px;height:28px;border-radius:50%;background:#075E54;color:#fff;display:flex;align-items:center;justify-content:center;">➤</div></div>
</div></div>''', 'Type “/” and your saved answers appear instantly.')

M_TOOLS = _fig(PHONE_OPEN + '''
<div style="background:#F5F3EF;border-radius:24px;overflow:hidden;">
  <div style="background:#075E54;color:#fff;padding:10px 13px;font-size:14px;font-weight:600;">‹  Business tools</div>
  <div>
    <div style="display:flex;align-items:center;gap:11px;padding:10px 13px;border-bottom:.5px solid #E7E3DA;"><span style="font-size:17px;">💬</span><div style="flex:1;"><div style="font-size:12px;">Greeting message</div><div style="font-size:10px;color:#9a958c;">Welcomes new customers</div></div><span style="font-size:10px;color:#128C7E;font-weight:600;">On</span></div>
    <div style="display:flex;align-items:center;gap:11px;padding:10px 13px;border-bottom:.5px solid #E7E3DA;"><span style="font-size:17px;">🌙</span><div style="flex:1;"><div style="font-size:12px;">Away message</div><div style="font-size:10px;color:#9a958c;">Replies after hours</div></div><span style="font-size:10px;color:#9a958c;">Off</span></div>
    <div style="display:flex;align-items:center;gap:11px;padding:10px 13px;border-bottom:.5px solid #E7E3DA;"><span style="font-size:17px;">⚡</span><div style="flex:1;"><div style="font-size:12px;">Quick replies</div><div style="font-size:10px;color:#9a958c;">/hours · /insurance · /pricing</div></div><span style="font-size:10px;color:#9a958c;">5</span></div>
    <div style="display:flex;align-items:center;gap:11px;padding:10px 13px;border-bottom:.5px solid #E7E3DA;"><span style="font-size:17px;">🏷️</span><div style="flex:1;"><div style="font-size:12px;">Lists</div><div style="font-size:10px;color:#9a958c;">Organize your customers</div></div><span style="font-size:10px;color:#9a958c;">8</span></div>
    <div style="display:flex;align-items:center;gap:11px;padding:10px 13px;border-bottom:.5px solid #E7E3DA;"><span style="font-size:17px;">🛍️</span><div style="flex:1;"><div style="font-size:12px;">Catalog</div><div style="font-size:10px;color:#9a958c;">Show your services</div></div><span style="font-size:10px;color:#9a958c;">6</span></div>
    <div style="display:flex;align-items:center;gap:11px;padding:10px 13px;"><span style="font-size:17px;">🔗</span><div style="flex:1;"><div style="font-size:12px;">Short link</div><div style="font-size:10px;color:#9a958c;">wa.me/12105550142</div></div><span style="color:#c7c2b8;">›</span></div>
  </div>
</div></div>''', 'Business tools — where greetings, quick replies, lists and your catalog live.')

M_LABELS = _fig(PHONE_OPEN + '''
<div style="background:#fff;border-radius:24px;overflow:hidden;">
  <div style="background:#075E54;color:#fff;padding:10px 13px;font-size:15px;font-weight:600;">Chats</div>
  <div>
    <div style="display:flex;gap:9px;padding:10px 11px;border-bottom:.5px solid #eee;"><div style="width:36px;height:36px;border-radius:50%;background:#E7F7EE;color:#075E54;font-weight:700;font-size:12px;display:flex;align-items:center;justify-content:center;">MR</div><div style="flex:1;min-width:0;"><div style="font-size:12px;font-weight:600;">Maria Ramirez</div><div style="font-size:10px;color:#9a958c;">What are your hours?</div><span style="display:inline-block;margin-top:3px;font-size:8.5px;background:#E7F7EE;color:#128C7E;padding:2px 6px;border-radius:5px;">● New lead</span></div></div>
    <div style="display:flex;gap:9px;padding:10px 11px;border-bottom:.5px solid #eee;"><div style="width:36px;height:36px;border-radius:50%;background:#E1F0F7;color:#2A6F97;font-weight:700;font-size:12px;display:flex;align-items:center;justify-content:center;">JC</div><div style="flex:1;min-width:0;"><div style="font-size:12px;font-weight:600;">James Carter</div><div style="font-size:10px;color:#9a958c;">See you Tuesday at 10!</div><span style="display:inline-block;margin-top:3px;font-size:8.5px;background:#E1F0F7;color:#2A6F97;padding:2px 6px;border-radius:5px;">● Appointment confirmed</span></div></div>
    <div style="display:flex;gap:9px;padding:10px 11px;border-bottom:.5px solid #eee;"><div style="width:36px;height:36px;border-radius:50%;background:#FBECEC;color:#b0413e;font-weight:700;font-size:12px;display:flex;align-items:center;justify-content:center;">SL</div><div style="flex:1;min-width:0;"><div style="font-size:12px;font-weight:600;">Sofia Lopez</div><div style="font-size:10px;color:#9a958c;">Invoice #2043 — $89</div><span style="display:inline-block;margin-top:3px;font-size:8.5px;background:#FBECEC;color:#b0413e;padding:2px 6px;border-radius:5px;">● Payment pending</span></div></div>
    <div style="display:flex;gap:9px;padding:10px 11px;"><div style="width:36px;height:36px;border-radius:50%;background:#FBF1DC;color:#8a5a10;font-weight:700;font-size:12px;display:flex;align-items:center;justify-content:center;">DW</div><div style="flex:1;min-width:0;"><div style="font-size:12px;font-weight:600;">Dr. Wong (referrals)</div><div style="font-size:10px;color:#9a958c;">Sent you two new patients 🙌</div><span style="display:inline-block;margin-top:3px;font-size:8.5px;background:#FBF1DC;color:#8a5a10;padding:2px 6px;border-radius:5px;">★ VIP</span></div></div>
  </div>
</div></div>''', 'Every customer has a status — your inbox becomes a pipeline.')

M_CATALOG = _fig(PHONE_OPEN + '''
<div style="background:#fff;border-radius:24px;overflow:hidden;">
  <div style="background:#075E54;color:#fff;padding:10px 13px;font-size:14px;font-weight:600;">‹  Catalog</div>
  <div style="height:130px;background:#ECE5DD;display:flex;align-items:center;justify-content:center;font-size:50px;">🦷</div>
  <div style="padding:13px 15px;">
    <div style="font-size:13px;font-weight:600;line-height:1.3;">New Patient Special — Exam, Cleaning &amp; X-Rays</div>
    <div style="font-size:19px;font-weight:700;color:#128C7E;margin:7px 0;">$89</div>
    <div style="font-size:11px;color:#5f5a50;line-height:1.5;">A complete check-up, professional cleaning, and digital X-rays for new patients. No insurance needed.</div>
    <div style="margin-top:14px;background:#25D366;color:#053d24;text-align:center;font-size:12px;font-weight:600;padding:10px;border-radius:20px;">Message to book</div>
  </div>
</div></div>''', 'Your catalog answers “what do you offer?” with one tap.')

M_HOURS = _fig(PHONE_OPEN + '''
<div style="background:#F5F3EF;border-radius:24px;overflow:hidden;">
  <div style="background:#075E54;color:#fff;padding:10px 13px;font-size:14px;font-weight:600;">‹  Business hours</div>
  <div style="padding:10px 13px;background:#E7F7EE;display:flex;justify-content:space-between;font-size:12px;color:#075E54;font-weight:600;">Open with hours <span>✓</span></div>
  <div>
    <div style="display:flex;justify-content:space-between;padding:10px 15px;border-bottom:.5px solid #E7E3DA;font-size:12px;"><span>Monday–Friday</span><span style="color:#5f5a50;">8:00 AM – 5:00 PM</span></div>
    <div style="display:flex;justify-content:space-between;padding:10px 15px;border-bottom:.5px solid #E7E3DA;font-size:12px;"><span>Saturday</span><span style="color:#5f5a50;">9:00 AM – 1:00 PM</span></div>
    <div style="display:flex;justify-content:space-between;padding:10px 15px;font-size:12px;"><span>Sunday</span><span style="color:#b0413e;">Closed</span></div>
  </div>
</div></div>''', 'Honest hours build trust — and power your away message.')

M_SHORTLINK = _fig(PHONE_OPEN + '''
<div style="background:#F5F3EF;border-radius:24px;overflow:hidden;">
  <div style="background:#075E54;color:#fff;padding:10px 13px;font-size:14px;font-weight:600;">‹  Short link</div>
  <div style="padding:20px 15px;text-align:center;">
    <div style="width:110px;height:110px;margin:0 auto;background:#fff;border:1px solid #e2ded4;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:52px;">▦</div>
    <div style="margin-top:14px;font-size:11px;color:#5f5a50;">Scan or share your link</div>
    <div style="margin:8px 8px 0;background:#fff;border:.5px solid #e2ded4;border-radius:9px;padding:9px 11px;font-size:11px;color:#075E54;display:flex;justify-content:space-between;"><span>wa.me/12105550142</span><span style="color:#128C7E;">⧉</span></div>
    <div style="margin:14px 8px 0;background:#25D366;color:#053d24;font-size:12px;font-weight:600;padding:10px;border-radius:20px;">Share link</div>
  </div>
</div></div>''', 'Put this QR on cards, invoices and your window — every scan starts a chat.')

M_PAYMENT = _fig(PHONE_OPEN + '''
<div style="background:#ECE5DD;border-radius:24px;overflow:hidden;">
  <div style="background:#075E54;color:#fff;padding:8px 12px 10px;display:flex;align-items:center;gap:9px;">
    <div style="width:32px;height:32px;border-radius:50%;background:#FBECEC;color:#b0413e;font-weight:700;font-size:12px;display:flex;align-items:center;justify-content:center;">SL</div>
    <div><div style="font-size:13px;font-weight:600;">Sofia Lopez</div><div style="font-size:9px;opacity:.85;">online</div></div>
  </div>
  <div style="padding:14px 11px;min-height:140px;">
    <div style="display:flex;justify-content:flex-end;margin-bottom:10px;"><div style="background:#fff;font-size:12px;line-height:1.45;padding:8px 10px;border-radius:9px 9px 2px 9px;max-width:88%;">Thank you for visiting today, Sofia! 😊 Here's your secure payment link:
      <div style="margin-top:7px;border:.5px solid #d7e8df;border-radius:9px;overflow:hidden;"><div style="background:#E7F7EE;padding:8px 10px;"><div style="font-size:9px;color:#128C7E;font-weight:600;">SECURE PAYMENT · $89.00</div><div style="font-size:10px;color:#075E54;">pay.brightsmile.com/inv2043</div></div><div style="background:#25D366;color:#053d24;text-align:center;font-size:11px;font-weight:600;padding:8px;">Pay now</div></div>
    </div></div>
    <div style="display:flex;justify-content:flex-start;"><div style="background:#fff;font-size:12px;padding:7px 10px;border-radius:9px 9px 9px 2px;">Just paid — thank you! 🙌</div></div>
  </div>
  <div style="background:#F0EFEA;padding:7px 9px;display:flex;align-items:center;gap:7px;"><div style="flex:1;background:#fff;border-radius:16px;padding:6px 11px;font-size:11px;color:#9a958c;">Message</div><div style="width:28px;height:28px;border-radius:50%;background:#075E54;color:#fff;display:flex;align-items:center;justify-content:center;">➤</div></div>
</div></div>''', 'One tap to pay — money arrives without an awkward conversation.')

# ---------- INFOGRAPHICS ----------

def _info(kicker, title, body, tail):
    return (f'<figure class="graphic infographic"><div class="ig-kicker">{kicker}</div>'
            f'<div class="ig-title">{title}</div><div class="ig-rule"></div>{body}'
            f'<div class="ig-tail">{tail}</div></figure>')

I_VERSIONS = _info('Chapter 1', 'The three versions of WhatsApp', '''
<table class="ig-table"><thead><tr><th></th><th>Personal</th><th class="hl">Business<br><span>Free · this book</span></th><th>API</th></tr></thead><tbody>
<tr><td>Cost</td><td>Free</td><td class="hlc" style="font-weight:700;color:#075E54;">Free</td><td>Pay per use</td></tr>
<tr><td>Auto messages</td><td class="x">✕</td><td class="hlc" style="color:#128C7E;font-weight:700;">✓</td><td style="color:#128C7E;">✓</td></tr>
<tr><td>Catalog</td><td class="x">✕</td><td class="hlc" style="color:#128C7E;font-weight:700;">✓</td><td style="color:#128C7E;">✓</td></tr>
<tr><td>Quick replies / lists</td><td class="x">✕</td><td class="hlc" style="color:#128C7E;font-weight:700;">✓</td><td style="color:#128C7E;">✓</td></tr>
<tr><td>Advanced automation</td><td class="x">✕</td><td class="hlc">Basic</td><td style="color:#128C7E;font-weight:700;">✓</td></tr>
<tr><td>System integration</td><td class="x">✕</td><td class="hlc x">✕</td><td style="color:#128C7E;font-weight:700;">✓</td></tr>
</tbody></table>''', 'The free <b>Business</b> app gives a small business almost everything it needs. The API is for scaling later.')

def _chip(bg, col, txt):
    return f'<span style="background:{bg};color:{col};padding:6px 11px;border-radius:18px;">{txt}</span>'
_arrow = '<span style="color:#c7c2b8;">→</span>'

I_PIPELINE = _info('Chapter 7', 'The customer pipeline, built from lists',
  '<div class="ig-flow">' + _arrow.join([
    _chip('#FBF1DC','#8a5a10','🟡 New lead'), _chip('#E1F0F7','#1C4E6B','🔵 Quote sent'),
    _chip('#FBEEE1','#9a5a1f','🟠 Follow-up needed'), _chip('#E7F7EE','#0B4A40','🟢 Active customer'),
    _chip('#EEE9F5','#4a3a72','🟣 Waiting on customer'), _chip('#FBECEC','#b0413e','🔴 Payment pending'),
    _chip('#FBF1DC','#8a5a10','⭐ VIP'), _chip('#EDEBE6','#44443f','⚫ Completed')]) + '</div>',
  'Every conversation gets one list. Each morning you open <b>Follow-up needed</b> and <b>Payment pending</b> first — that is where the revenue hides.')

I_TIMELINE = _info('Chapter 5', 'The 14-day follow-up rhythm', '''
<div style="position:relative;margin:6px;"><div style="position:absolute;top:9px;left:6%;right:6%;height:2px;background:#d8d2c6;"></div>
<div style="display:flex;justify-content:space-between;position:relative;">
<div style="text-align:center;width:19%;"><div style="width:18px;height:18px;border-radius:50%;background:#128C7E;margin:0 auto;"></div><div style="font-size:11px;font-weight:700;color:#075E54;margin-top:7px;">Day 0</div><div style="font-size:10px;color:#5f5a50;">Send proposal</div></div>
<div style="text-align:center;width:19%;"><div style="width:18px;height:18px;border-radius:50%;background:#fff;border:2px solid #128C7E;margin:0 auto;"></div><div style="font-size:11px;font-weight:700;color:#075E54;margin-top:7px;">Day 2</div><div style="font-size:10px;color:#5f5a50;">Confirmation</div></div>
<div style="text-align:center;width:19%;"><div style="width:18px;height:18px;border-radius:50%;background:#fff;border:2px solid #128C7E;margin:0 auto;"></div><div style="font-size:11px;font-weight:700;color:#075E54;margin-top:7px;">Day 5</div><div style="font-size:10px;color:#5f5a50;">Helpful tip</div></div>
<div style="text-align:center;width:19%;"><div style="width:18px;height:18px;border-radius:50%;background:#fff;border:2px solid #128C7E;margin:0 auto;"></div><div style="font-size:11px;font-weight:700;color:#075E54;margin-top:7px;">Day 10</div><div style="font-size:10px;color:#5f5a50;">Customer story</div></div>
<div style="text-align:center;width:19%;"><div style="width:18px;height:18px;border-radius:50%;background:#E0A83C;margin:0 auto;"></div><div style="font-size:11px;font-weight:700;color:#075E54;margin-top:7px;">Day 14</div><div style="font-size:10px;color:#5f5a50;">Final check-in</div></div>
</div></div>''', 'Six gentle touchpoints, each one helpful — not pushy. Save them as Quick Replies so a follow-up takes one tap.')

def _pill(txt, hero=False):
    if hero:
        return f'<span style="background:#25D366;color:#053d24;font-weight:700;padding:6px 11px;border-radius:7px;">{txt}</span>'
    return f'<span style="border:.5px solid #cfc8ba;background:#fff;padding:6px 11px;border-radius:7px;">{txt}</span>'

I_PAYFLOW = _info('Chapter 8', 'One payment system, every time',
  '<div class="ig-flow" style="font-weight:500;">' + _arrow.join([
    _pill('Estimate'), _pill('Deposit'), _pill('Confirmation'), _pill('Reminder'),
    _pill('Payment', True), _pill('Receipt'), _pill('Thank you'), _pill('Review'), _pill('Referral')]) + '</div>',
  'When every customer moves through the same steps, cash flow becomes predictable and late payments shrink.')

I_ECOSYSTEM = _info('Chapter 10', 'Everything connected, working on its own', '''
<svg viewBox="0 0 520 230" style="width:100%;height:auto;" role="img" aria-label="Central hub connected to booking, payment, reminders and reviews">
<line x1="260" y1="115" x2="95" y2="55" stroke="#128C7E" stroke-width="2"/><line x1="260" y1="115" x2="425" y2="55" stroke="#128C7E" stroke-width="2"/><line x1="260" y1="115" x2="95" y2="175" stroke="#128C7E" stroke-width="2"/><line x1="260" y1="115" x2="425" y2="175" stroke="#128C7E" stroke-width="2"/>
<circle cx="260" cy="115" r="40" fill="#075E54"/><text x="260" y="112" text-anchor="middle" fill="#fff" font-size="12" font-family="Georgia,serif">WhatsApp</text><text x="260" y="127" text-anchor="middle" fill="#9fe1cb" font-size="9">hub</text>
<g font-family="sans-serif" font-size="11.5" fill="#0B2721">
<rect x="20" y="35" width="150" height="40" rx="9" fill="#fff" stroke="#cfc8ba" stroke-width="0.5"/><text x="95" y="60" text-anchor="middle">Online booking</text>
<rect x="350" y="35" width="150" height="40" rx="9" fill="#fff" stroke="#cfc8ba" stroke-width="0.5"/><text x="425" y="60" text-anchor="middle">Payment</text>
<rect x="20" y="155" width="150" height="40" rx="9" fill="#fff" stroke="#cfc8ba" stroke-width="0.5"/><text x="95" y="180" text-anchor="middle">Reminders</text>
<rect x="350" y="155" width="150" height="40" rx="9" fill="#fff" stroke="#cfc8ba" stroke-width="0.5"/><text x="425" y="180" text-anchor="middle">Reviews</text>
</g></svg>''', 'A customer books, pays, gets reminders and leaves a review — and nobody touched a keyboard. This is the API level, for when you are ready to scale.')

def _step(day, txt):
    return f'<div style="background:#fff;border:.5px solid #e2ded4;border-radius:9px;padding:10px 12px;"><div style="font-size:10px;color:#128C7E;font-weight:700;">{day}</div><div style="font-size:12px;margin-top:2px;">{txt}</div></div>'

I_ROADMAP = _info('Chapter 12', 'Your 7-day transformation',
  '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:9px;">' +
  _step('DAY 1','Build your digital front door') + _step('DAY 2','Hire your first digital employee') +
  _step('DAY 3','Organize every customer') + _step('DAY 4','Build your sales system') +
  _step('DAY 5','Build your follow-up machine') + _step('DAY 6','Add artificial intelligence') +
  _step('DAY 7','Think like a CEO') +
  '<div style="background:#E7F7EE;border:.5px solid #bfe6d3;border-radius:9px;padding:10px 12px;display:flex;align-items:center;gap:7px;"><span style="font-size:18px;">🚩</span><div style="font-size:12px;font-weight:600;color:#075E54;">A business that runs on systems</div></div></div>',
  'One improvement a day. One system a week. One better business a year.')

# ---------- INFOGRAPHICS — SPANISH ----------

I_VERSIONS_ES = _info('Capítulo 1', 'Las tres versiones de WhatsApp', '''
<table class="ig-table"><thead><tr><th></th><th>Personal</th><th class="hl">Business<br><span>Gratis · este libro</span></th><th>API</th></tr></thead><tbody>
<tr><td>Costo</td><td>Gratis</td><td class="hlc" style="font-weight:700;color:#075E54;">Gratis</td><td>Pago por uso</td></tr>
<tr><td>Mensajes automáticos</td><td class="x">✕</td><td class="hlc" style="color:#128C7E;font-weight:700;">✓</td><td style="color:#128C7E;">✓</td></tr>
<tr><td>Catálogo</td><td class="x">✕</td><td class="hlc" style="color:#128C7E;font-weight:700;">✓</td><td style="color:#128C7E;">✓</td></tr>
<tr><td>Respuestas rápidas / etiquetas</td><td class="x">✕</td><td class="hlc" style="color:#128C7E;font-weight:700;">✓</td><td style="color:#128C7E;">✓</td></tr>
<tr><td>Automatización avanzada</td><td class="x">✕</td><td class="hlc">Básica</td><td style="color:#128C7E;font-weight:700;">✓</td></tr>
<tr><td>Integración con sistemas</td><td class="x">✕</td><td class="hlc x">✕</td><td style="color:#128C7E;font-weight:700;">✓</td></tr>
</tbody></table>''', 'La app <b>Business</b> gratuita le da a un pequeño negocio casi todo lo que necesita. La API es para escalar más adelante.')

I_PIPELINE_ES = _info('Capítulo 7', 'El pipeline de clientes, hecho con etiquetas',
  '<div class="ig-flow">' + _arrow.join([
    _chip('#FBF1DC','#8a5a10','🟡 Cliente nuevo'), _chip('#E1F0F7','#1C4E6B','🔵 Cotización enviada'),
    _chip('#FBEEE1','#9a5a1f','🟠 Seguimiento pendiente'), _chip('#E7F7EE','#0B4A40','🟢 Cliente activo'),
    _chip('#EEE9F5','#4a3a72','🟣 Esperando al cliente'), _chip('#FBECEC','#b0413e','🔴 Pago pendiente'),
    _chip('#FBF1DC','#8a5a10','⭐ VIP'), _chip('#EDEBE6','#44443f','⚫ Completado')]) + '</div>',
  'Cada conversación recibe una sola etiqueta. Cada mañana abre primero <b>Seguimiento pendiente</b> y <b>Pago pendiente</b> — ahí está escondido el dinero.')

I_TIMELINE_ES = _info('Capítulo 11', 'El ritmo de seguimiento de 14 días', '''
<div style="position:relative;margin:6px;"><div style="position:absolute;top:9px;left:6%;right:6%;height:2px;background:#d8d2c6;"></div>
<div style="display:flex;justify-content:space-between;position:relative;">
<div style="text-align:center;width:19%;"><div style="width:18px;height:18px;border-radius:50%;background:#128C7E;margin:0 auto;"></div><div style="font-size:11px;font-weight:700;color:#075E54;margin-top:7px;">Día 0</div><div style="font-size:10px;color:#5f5a50;">Envía cotización</div></div>
<div style="text-align:center;width:19%;"><div style="width:18px;height:18px;border-radius:50%;background:#fff;border:2px solid #128C7E;margin:0 auto;"></div><div style="font-size:11px;font-weight:700;color:#075E54;margin-top:7px;">Día 2</div><div style="font-size:10px;color:#5f5a50;">Confirmación</div></div>
<div style="text-align:center;width:19%;"><div style="width:18px;height:18px;border-radius:50%;background:#fff;border:2px solid #128C7E;margin:0 auto;"></div><div style="font-size:11px;font-weight:700;color:#075E54;margin-top:7px;">Día 5</div><div style="font-size:10px;color:#5f5a50;">Tip útil</div></div>
<div style="text-align:center;width:19%;"><div style="width:18px;height:18px;border-radius:50%;background:#fff;border:2px solid #128C7E;margin:0 auto;"></div><div style="font-size:11px;font-weight:700;color:#075E54;margin-top:7px;">Día 10</div><div style="font-size:10px;color:#5f5a50;">Historia de cliente</div></div>
<div style="text-align:center;width:19%;"><div style="width:18px;height:18px;border-radius:50%;background:#E0A83C;margin:0 auto;"></div><div style="font-size:11px;font-weight:700;color:#075E54;margin-top:7px;">Día 14</div><div style="font-size:10px;color:#5f5a50;">Último mensaje</div></div>
</div></div>''', 'Seis contactos amables, cada uno útil — nunca insistente. Guárdalos como Atajos para que un seguimiento tome un solo toque.')

I_PAYFLOW_ES = _info('Capítulo 8', 'Un solo flujo de cobro, siempre',
  '<div class="ig-flow" style="font-weight:500;">' + _arrow.join([
    _pill('Cotización'), _pill('Anticipo'), _pill('Confirmación'), _pill('Recordatorio'),
    _pill('Pago', True), _pill('Recibo'), _pill('Gracias'), _pill('Reseña'), _pill('Referido')]) + '</div>',
  'Cuando cada cliente pasa por los mismos pasos, tu flujo de efectivo se vuelve predecible y los pagos atrasados disminuyen.')

I_ROADMAP_ES = _info('Cierre', 'Tu primera semana',
  '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:9px;">' +
  _step('DÍA 1','Instala la app y completa tu perfil') + _step('DÍA 2','Activa bienvenida y ausencia') +
  _step('DÍA 3','Crea cinco Atajos') + _step('DÍA 4','Arma tu catálogo y tu QR') +
  _step('DÍA 5','Crea tus etiquetas') + _step('DÍA 6','Configura tu enlace de pago') +
  _step('DÍA 7','Suma la IA y el seguimiento') +
  '<div style="background:#E7F7EE;border:.5px solid #bfe6d3;border-radius:9px;padding:10px 12px;display:flex;align-items:center;gap:7px;"><span style="font-size:18px;">🚩</span><div style="font-size:12px;font-weight:600;color:#075E54;">Un negocio que funciona con sistemas</div></div></div>',
  'Una mejora al día. Un sistema a la semana. Un mejor negocio cada año.')

GRAPHICS_ES = {
    'versions':  I_VERSIONS_ES,
    'tools':     M_TOOLS,
    'catalog':   M_CATALOG,
    'hours':     M_HOURS,
    'shortlink': M_SHORTLINK,
    'greeting':  M_GREETING,
    'away':      M_AWAY,
    'quick':     M_QUICK,
    'timeline':  I_TIMELINE_ES,
    'pipeline':  I_PIPELINE_ES,
    'labels':    M_LABELS,
    'payflow':   I_PAYFLOW_ES,
    'payment':   M_PAYMENT,
    'ecosystem': I_ECOSYSTEM,
    'roadmap':   I_ROADMAP_ES,
}

# ---------- BY NAME (placed inline via <!--GFX:name--> markers) ----------
GRAPHICS = {
    'versions':  I_VERSIONS,
    'tools':     M_TOOLS,
    'catalog':   M_CATALOG,
    'hours':     M_HOURS,
    'shortlink': M_SHORTLINK,
    'greeting':  M_GREETING,
    'away':      M_AWAY,
    'quick':     M_QUICK,
    'timeline':  I_TIMELINE,
    'pipeline':  I_PIPELINE,
    'labels':    M_LABELS,
    'payflow':   I_PAYFLOW,
    'payment':   M_PAYMENT,
    'ecosystem': I_ECOSYSTEM,
    'roadmap':   I_ROADMAP,
}
