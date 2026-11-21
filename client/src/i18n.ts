export type Language = 'en' | 'ta' | 'hi';

export interface Translations {
  // Navigation
  appName: string;
  tabReport: string;
  tabTracker: string;
  tabMap: string;
  tabChampions: string;
  tabAdmin: string;
  aiOnline: string;

  // Accessibility Bar
  langSelect: string;
  fontSize: string;
  highContrast: string;

  // Report Issue Form
  reportHeader: string;
  reportSub: string;
  titleLabel: string;
  titlePlaceholder: string;
  descLabel: string;
  descPlaceholder: string;
  locationLabel: string;
  locationPlaceholder: string;
  categoryLabel: string;
  citizenNameLabel: string;
  citizenContactLabel: string;
  imageLabel: string;
  submitBtn: string;
  submittingBtn: string;
  speakBtn: string;
  listening: string;

  // Post-Submission Confirmation Modal
  thankYouHeader: string;
  thankYouBody: string;
  civicMotivation: string;
  trackMyReportBtn: string;
  doneBtn: string;

  // AI Triage Panel
  aiPanelHeader: string;
  aiSummaryLabel: string;
  impactReasoningLabel: string;
  recommendedActionLabel: string;
  estimatedHoursLabel: string;
  slaDeadlineLabel: string;
  departmentLabel: string;
  priorityScoreLabel: string;
  downloadPdfBtn: string;
  readAloudBtn: string;
  stopVoiceBtn: string;

  // Tracker & Modals
  searchPlaceholder: string;
  allCategories: string;
  allPriorities: string;
  allStatuses: string;
  supportBtn: string;
  supportedBtn: string;
  caseIdLabel: string;
  publicUpdatesTitle: string;
  actionHistoryTitle: string;
  internalNotesTitle: string;
  translatingIndicator: string;

  // Civic Champions & Leaderboard
  championsHeader: string;
  championsSub: string;
  yourCivicScore: string;
  yourRank: string;
  pointsLabel: string;
  quarterlyRewardsNotice: string;
  leaderboardTitle: string;
  citizenCol: string;
  scoreCol: string;
  reportsCol: string;
  resolvedCol: string;
  rankCol: string;
  quarterlyMedalsTitle: string;
  quarterlyCycleBadge: string;
  goldMedalTitle: string;
  silverMedalTitle: string;
  bronzeMedalTitle: string;

  // Admin & Municipal Authority Sign-In
  adminLoginTitle: string;
  adminLoginSub: string;
  adminEmailLabel: string;
  adminPasswordLabel: string;
  adminSignInBtn: string;
  adminDemoCredentialsTitle: string;
  adminFillAndSignIn: string;
  adminMfaCodeLabel: string;
  adminMfaVerifyBtn: string;

  // Notifications
  notificationsTitle: string;
  markAllReadBtn: string;
  noNotifications: string;
  channelInApp: string;
  channelEmail: string;
  channelSms: string;

  // Forgot & Reset Password
  forgotPassword: string;
  resetPasswordTitle: string;
  sendOtpBtn: string;
  resetPasswordBtn: string;
  otpLabel: string;
  newPasswordLabel: string;
  confirmPasswordLabel: string;
  backToLogin: string;

  // Notification Centre Selection
  deleteSelected: string;
  selectAll: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    appName: 'CivicResolve',
    tabReport: 'Report Issue',
    tabTracker: 'Issue Tracker',
    tabMap: 'Issue Map',
    tabChampions: 'Civic Recognition',
    tabAdmin: 'Admin & Dept Portal',
    aiOnline: 'AI Online',

    langSelect: 'Language',
    fontSize: 'Font Size',
    highContrast: 'High Contrast',

    reportHeader: 'Report a Civic Issue',
    reportSub: 'AI-powered municipal grievance reporting with automated triage & SLA tracking',
    titleLabel: 'Issue Title',
    titlePlaceholder: 'e.g., Deep pothole near junction',
    descLabel: 'Detailed Description',
    descPlaceholder: 'Describe the civic problem, hazard, or damage in detail...',
    locationLabel: 'Location & Landmark',
    locationPlaceholder: 'e.g., MG Road, Near Central Mall, Ward 12',
    categoryLabel: 'Category (Optional Suggestion)',
    citizenNameLabel: 'Your Full Name',
    citizenContactLabel: 'Mobile / WhatsApp (for SMS Updates)',
    imageLabel: 'Attach Photo / Evidence',
    submitBtn: 'Submit Civic Report',
    submittingBtn: 'Analyzing with Gemini AI...',
    speakBtn: '🎤 Dictate Issue',
    listening: '🔴 Listening... Speak now',

    thankYouHeader: 'Thank You for Speaking Up!',
    thankYouBody: 'Your report ({caseId}) has been received and routed directly to the {department}. Necessary action will be taken within the allotted {hours}-hour resolution window. Once completed, we will notify you immediately.',
    civicMotivation: 'Every verified report earns you Civic Champion points toward quarterly community recognition.',
    trackMyReportBtn: '📊 Track My Report',
    doneBtn: 'Done',

    aiPanelHeader: 'Gemini AI Triage Assessment',
    aiSummaryLabel: 'Operational Summary',
    impactReasoningLabel: 'Public Impact Analysis',
    recommendedActionLabel: 'Recommended Field Action',
    estimatedHoursLabel: 'Target Resolution',
    slaDeadlineLabel: 'SLA Deadline',
    departmentLabel: 'Assigned Department',
    priorityScoreLabel: 'Urgency Score',
    downloadPdfBtn: '📄 Download Official Case PDF',
    readAloudBtn: '🔊 Read Aloud',
    stopVoiceBtn: '⏹️ Stop Voice',

    searchPlaceholder: 'Search complaints by title, location, or Case ID...',
    allCategories: 'All Categories',
    allPriorities: 'All Priorities',
    allStatuses: 'All Statuses',
    supportBtn: '👍 Support',
    supportedBtn: '✓ Supported',
    caseIdLabel: 'Case ID',
    publicUpdatesTitle: 'Citizen Public Updates',
    actionHistoryTitle: 'Complete Action History',
    internalNotesTitle: 'Internal Authority Notes',
    translatingIndicator: '🌐 Translating...',

    championsHeader: '🏛️ Citizen Honour Roll & Civic Recognition',
    championsSub: 'Official municipal recognition for citizens who safeguard public infrastructure and support community governance',
    yourCivicScore: 'Your Civic Score',
    yourRank: 'Your Municipal Rank',
    pointsLabel: 'Points',
    quarterlyRewardsNotice: 'Quarterly Recognition: Top citizens receive official municipal certificates and civic reward vouchers every 3 months.',
    leaderboardTitle: 'Civic Recognition Honour Roll',
    citizenCol: 'Citizen Contributor',
    scoreCol: 'Civic Score',
    reportsCol: 'Valid Reports',
    resolvedCol: 'Resolved Cases',
    rankCol: 'Rank',
    quarterlyMedalsTitle: 'Municipal Department Quarterly Honors (Q4 2026)',
    quarterlyCycleBadge: 'Quarterly Review Cycle: Every 3 Months',
    goldMedalTitle: '🥇 Gold Medal of Civic Excellence',
    silverMedalTitle: '🥈 Silver Medal of Public Service',
    bronzeMedalTitle: '🥉 Bronze Medal of Accountability',

    // Admin & Municipal Authority Sign-In
    adminLoginTitle: 'Municipal Authority Sign-In',
    adminLoginSub: 'Secure role-based portal for the Municipal Commissioner and Department Heads',
    adminEmailLabel: 'Official Email Address',
    adminPasswordLabel: 'Password',
    adminSignInBtn: 'Sign In to Department Portal →',
    adminDemoCredentialsTitle: 'Demo Credentials (For Evaluators)',
    adminFillAndSignIn: 'Sign In',
    adminMfaCodeLabel: 'Enter 6-Digit MFA Verification Code',
    adminMfaVerifyBtn: 'Verify & Sign In →',

    notificationsTitle: 'Citizen Notification Centre',
    markAllReadBtn: 'Mark All as Read',
    noNotifications: 'No alerts or notifications yet.',
    channelInApp: 'In-App',
    channelEmail: 'Email Sent',
    channelSms: 'SMS Queued',

    forgotPassword: 'Forgot Password?',
    resetPasswordTitle: 'Reset Password',
    sendOtpBtn: 'Send OTP',
    resetPasswordBtn: 'Reset Password',
    otpLabel: 'Enter 6-Digit OTP',
    newPasswordLabel: 'New Password',
    confirmPasswordLabel: 'Confirm Password',
    backToLogin: 'Back to Sign In',

    deleteSelected: 'Delete Selected',
    selectAll: 'Select All',
  },

  ta: {
    appName: 'CivicResolve (குடிமக்கள் தீர்வு)',
    tabReport: 'புகார் பதிவு',
    tabTracker: 'புகார் கண்காணிப்பு',
    tabMap: 'நகர வரைபடம்',
    tabChampions: 'குடிமக்கள் பங்களிப்பு',
    tabAdmin: 'நிர்வாக தளம்',
    aiOnline: 'AI இயங்குகிறது',

    langSelect: 'மொழி',
    fontSize: 'எழுத்து அளவு',
    highContrast: 'உயர் மாறுபாடு',

    reportHeader: 'நகராட்சி குறைதீர்ப்பு மனு',
    reportSub: 'AI அடிப்படையிலான உடனடி குறைதீர்ப்பு மற்றும் கண்காணிப்பு தளம்',
    titleLabel: 'புகார் தலைப்பு',
    titlePlaceholder: 'எ.கா., மெயின் ரோட்டில் பெரிய பள்ளம்',
    descLabel: 'விரிவான விளக்கம்',
    descPlaceholder: 'பிரச்சனையின் தன்மை மற்றும் ஆபத்தை விரிவாக விவரிக்கவும்...',
    locationLabel: 'இடம் மற்றும் அடையாளம்',
    locationPlaceholder: 'எ.கா., காந்தி நகர் சந்திப்பு, வார்டு 5',
    categoryLabel: 'பிரிவு (விருப்பம்)',
    citizenNameLabel: 'மனுதாரர் பெயர்',
    citizenContactLabel: 'மொபைல் எண் (SMS தகவல்களுக்கு)',
    imageLabel: 'புகைப்படம் இணைக்கவும்',
    submitBtn: 'நகராட்சியில் புகார் சமர்ப்பிக்கவும்',
    submittingBtn: 'Gemini AI ஆய்வு செய்கிறது...',
    speakBtn: '🎤 குரல் பதிவு (பேசவும்)',
    listening: '🔴 கேட்கிறது... பேசவும்',

    thankYouHeader: 'குரல் கொடுத்ததற்கு நன்றி!',
    thankYouBody: 'உங்கள் புகார் ({caseId}) பெறப்பட்டு நேரடியாக {department}-க்கு அனுப்பப்பட்டுள்ளது. ஒதுக்கப்பட்ட {hours} மணி நேரத்திற்குள் உரிய நடவடிக்கை எடுக்கப்படும். பணி முடிந்ததும் உங்களுக்கு உடனடியாக தகவல் தெரிவிக்கப்படும்.',
    civicMotivation: 'ஒவ்வொரு உண்மை புகாரும் உங்களை காலாண்டு சமூக அங்கீகாரத்திற்கான சிவிக் சாம்பியன் புள்ளிகளைப் பெறச் செய்கிறது.',
    trackMyReportBtn: '📊 புகாரைக் கண்காணிக்கவும்',
    doneBtn: 'முடிந்தது',

    aiPanelHeader: 'Gemini AI பரிசீலனை முடிவு',
    aiSummaryLabel: 'சுருக்கமான அறிக்கை',
    impactReasoningLabel: 'பொதுமக்கள் பாதிப்பு பகுப்பாய்வு',
    recommendedActionLabel: 'பரிந்துரைக்கப்பட்ட நடவடிக்கை',
    estimatedHoursLabel: 'தீர்வு கால அளவு',
    slaDeadlineLabel: 'கடைசி காலக்கெடு',
    departmentLabel: 'ஒதுக்கப்பட்ட துறை',
    priorityScoreLabel: 'முன்னுரிமை மதிப்பீடு',
    downloadPdfBtn: '📄 அதிகாரப்பூர்வ PDF பதிவிறக்கம்',
    readAloudBtn: '🔊 உரக்க வாசிக்கவும்',
    stopVoiceBtn: '⏹️ குரலை நிறுத்தவும்',

    searchPlaceholder: 'தலைப்பு, இடம் அல்லது வழக்கு எண் கொண்டு தேடவும்...',
    allCategories: 'அனைத்து பிரிவுகள்',
    allPriorities: 'அனைத்து முன்னுரிமை',
    allStatuses: 'அனைத்து நிலைகள்',
    supportBtn: '👍 ஆதரவு',
    supportedBtn: '✓ ஆதரிக்கப்பட்டது',
    caseIdLabel: 'வழக்கு எண்',
    publicUpdatesTitle: 'பொதுமக்கள் முன்னேற்ற அறிக்கைகள்',
    actionHistoryTitle: 'முழுமையான நடவடிக்கை வரலாறு',
    internalNotesTitle: 'உள் துறை குறிப்புகள்',
    translatingIndicator: '🌐 மொழிபெயர்க்கிறது...',

    championsHeader: '🏛️ குடிமக்கள் கௌரவப் பட்டியல் மற்றும் அங்கீகாரம்',
    championsSub: 'பொது உள்கட்டமைப்பைப் பாதுகாக்கும் சிறந்த குடிமக்களுக்கான நகராட்சி அங்கீகாரம்',
    yourCivicScore: 'உங்கள் சிவிக் மதிப்பெண்',
    yourRank: 'உங்கள் நகராட்சி தரம்',
    pointsLabel: 'புள்ளிகள்',
    quarterlyRewardsNotice: 'காலாண்டு அங்கீகாரம்: சிறந்த குடிமக்களுக்கு ஒவ்வொரு 3 மாதங்களுக்கும் அதிகாரப்பூர்வ நகராட்சி சான்றிதழ்கள் மற்றும் பரிசுகள் வழங்கப்படும்.',
    leaderboardTitle: 'குடிமக்கள் பங்களிப்பு கௌரவப் பட்டியல்',
    citizenCol: 'குடிமக்கள் பங்களிப்பாளர்',
    scoreCol: 'சிவிக் மதிப்பெண்',
    reportsCol: 'சரியான புகார்கள்',
    resolvedCol: 'தீர்க்கப்பட்ட வழக்குகள்',
    rankCol: 'தரம்',
    quarterlyMedalsTitle: 'நகராட்சி துறைகளின் காலாண்டு பதக்கங்கள் (Q4 2026)',
    quarterlyCycleBadge: 'காலாண்டு மதிப்பாய்வு சுழற்சி: ஒவ்வொரு 3 மாதங்களுக்கும்',
    goldMedalTitle: '🥇 நகராட்சி சிறப்பிற்கான தங்கப் பதக்கம்',
    silverMedalTitle: '🥈 மக்கள் சேவைக்கான வெள்ளிப் பதக்கம்',
    bronzeMedalTitle: '🥉 பொறுப்புடைமைக்கான வெண்கலப் பதக்கம்',

    // Admin & Municipal Authority Sign-In
    adminLoginTitle: 'நகராட்சி அதிகாரிகள் உள்நுழைவு',
    adminLoginSub: 'நகராட்சி ஆணையர் மற்றும் துறைத் தலைவர்களுக்கான பாதுகாப்பான தளம்',
    adminEmailLabel: 'அதிகாரப்பூர்வ மின்னஞ்சல் முகவரி',
    adminPasswordLabel: 'கடவுச்சொல்',
    adminSignInBtn: 'துறை தளத்தில் உள்நுழைக →',
    adminDemoCredentialsTitle: 'மாதிரி உள்நுழைவு விவரங்கள்',
    adminFillAndSignIn: 'உள்நுழைக',
    adminMfaCodeLabel: '6 இலக்க MFA சரிபார்ப்புக் குறியீட்டை உள்ளிடவும்',
    adminMfaVerifyBtn: 'சரிபார்த்து உள்நுழைக →',

    notificationsTitle: 'குடிமக்கள் அறிவிப்பு மையம்',
    markAllReadBtn: 'அனைத்தையும் வாசித்ததாக குறிக்கவும்',
    noNotifications: 'தற்போது எந்த அறிவிப்பும் இல்லை.',
    channelInApp: 'செயலி',
    channelEmail: 'மின்னஞ்சல் அனுப்பப்பட்டது',
    channelSms: 'SMS வரிசையில்',

    forgotPassword: 'கடவுச்சொல்லை மறந்துவிட்டீர்களா?',
    resetPasswordTitle: 'கடவுச்சொல் மீட்டமைப்பு',
    sendOtpBtn: 'OTP அனுப்புக',
    resetPasswordBtn: 'கடவுச்சொல்லை மாற்றுக',
    otpLabel: '6-இலக்க OTP-ஐ உள்ளிடவும்',
    newPasswordLabel: 'புதிய கடவுச்சொல்',
    confirmPasswordLabel: 'கடவுச்சொல்லை உறுதிப்படுத்தவும்',
    backToLogin: 'மீண்டும் உள்நுழைய',

    deleteSelected: 'தேர்ந்தெடுக்கப்பட்டதை நீக்குக',
    selectAll: 'அனைத்தையும் தேர்ந்தெடு',
  },

  hi: {
    appName: 'CivicResolve (नागरिक समाधान)',
    tabReport: 'शिकायत दर्ज करें',
    tabTracker: 'शिकायत ट्रैकर',
    tabMap: 'नागरिक मानचित्र',
    tabChampions: 'नागरिक योगदान',
    tabAdmin: 'प्रशासन पोर्टल',
    aiOnline: 'AI सक्रिय',

    langSelect: 'भाषा',
    fontSize: 'फ़ॉन्ट आकार',
    highContrast: 'हाई कंट्रास्ट',

    reportHeader: 'नागरिक समस्या दर्ज करें',
    reportSub: 'AI-संचालित नगरपालिका शिकायत निवारण एवं रियल-टाइम ट्रैकिंग',
    titleLabel: 'शिकायत का शीर्षक',
    titlePlaceholder: 'उदा. मुख्य सड़क पर बड़ा गड्ढा',
    descLabel: 'विस्तृत विवरण',
    descPlaceholder: 'समस्या, स्थान और खतरे का विस्तार से विवरण दें...',
    locationLabel: 'स्थान और निकटतम लैंडमार्क',
    locationPlaceholder: 'उदा. एमजी रोड, सेंट्रल मार्केट के पास, वार्ड 12',
    categoryLabel: 'श्रेणी (वैकल्पिक सुझाव)',
    citizenNameLabel: 'शिकायतकर्ता का नाम',
    citizenContactLabel: 'मोबाइल नंबर (SMS अपडेट के लिए)',
    imageLabel: 'फोटो / साक्ष्य संलग्न करें',
    submitBtn: 'नागरिक रिपोर्ट दर्ज करें',
    submittingBtn: 'Gemini AI विश्लेषण कर रहा है...',
    speakBtn: '🎤 बोलकर दर्ज करें',
    listening: '🔴 सुन रहे हैं... कृपया बोलें',

    thankYouHeader: 'आवाज उठाने के लिए धन्यवाद!',
    thankYouBody: 'आपकी शिकायत ({caseId}) प्राप्त हो गई है और इसे सीधे {department} को भेज दिया गया है। निर्धारित {hours} घंटे की समय सीमा के भीतर आवश्यक कार्रवाई की जाएगी। कार्य पूरा होने पर आपको तुरंत सूचित किया जाएगा।',
    civicMotivation: 'प्रत्येक सत्यापित शिकायत आपको त्रैमासिक सामुदायिक सम्मान के लिए नागरिक चैंपियन अंक दिलाती है।',
    trackMyReportBtn: '📊 मेरी शिकायत ट्रैक करें',
    doneBtn: 'पूर्ण',

    aiPanelHeader: 'Gemini AI त्वरित जांच परिणाम',
    aiSummaryLabel: 'समस्या का संक्षिप्त विवरण',
    impactReasoningLabel: 'जनता पर प्रभाव विश्लेषण',
    recommendedActionLabel: 'अनुशंसित निवारण कार्रवाई',
    estimatedHoursLabel: 'निवारण समय सीमा',
    slaDeadlineLabel: 'SLA अंतिम तिथि',
    departmentLabel: 'संबंधित विभाग',
    priorityScoreLabel: 'प्राथमिकता अंक',
    downloadPdfBtn: '📄 आधिकारिक केस रिपोर्ट PDF डाउनलोड करें',
    readAloudBtn: '🔊 पढ़कर सुनाएं',
    stopVoiceBtn: '⏹️ आवाज रोकें',

    searchPlaceholder: 'शीर्षक, स्थान या केस आईडी द्वारा खोजें...',
    allCategories: 'सभी श्रेणियां',
    allPriorities: 'सभी प्राथमिकताएं',
    allStatuses: 'सभी स्थितियां',
    supportBtn: '👍 समर्थन दें',
    supportedBtn: '✓ समर्थित',
    caseIdLabel: 'केस आईडी',
    publicUpdatesTitle: 'सार्वजनिक प्रगति अपडेट',
    actionHistoryTitle: 'पूर्ण कार्रवाई इतिहास',
    internalNotesTitle: 'विभागीय आंतरिक नोट्स',
    translatingIndicator: '🌐 अनुवाद हो रहा है...',

    championsHeader: '🏛️ नागरिक सम्मान सूची एवं योगदान',
    championsSub: 'सार्वजनिक बुनियादी ढांचे की सुरक्षा और नागरिक सेवाओं में सहयोग के लिए आधिकारिक नगरपालिका सम्मान',
    yourCivicScore: 'आपका नागरिक स्कोर',
    yourRank: 'आपकी नगरपालिका रैंक',
    pointsLabel: 'अंक',
    quarterlyRewardsNotice: 'त्रैमासिक सम्मान: शीर्ष नागरिकों को हर 3 महीने में आधिकारिक नगरपालिका प्रमाण पत्र और उपहार दिए जाते हैं।',
    leaderboardTitle: 'नागरिक योगदान सम्मान सूची',
    citizenCol: 'नागरिक योगदानकर्ता',
    scoreCol: 'नागरिक स्कोर',
    reportsCol: 'सत्यापित शिकायतें',
    resolvedCol: 'हल किए गए मामले',
    rankCol: 'रैंक',
    quarterlyMedalsTitle: 'नगरपालिका विभाग त्रैमासिक पदक (Q4 2026)',
    quarterlyCycleBadge: 'त्रैमासिक समीक्षा चक्र: हर 3 महीने में',
    goldMedalTitle: '🥇 नागरिक उत्कृष्टता स्वर्ण पदक',
    silverMedalTitle: '🥈 जनसेवा रजत पदक',
    bronzeMedalTitle: '🥉 जवाबदेही कांस्य पदक',

    // Admin & Municipal Authority Sign-In
    adminLoginTitle: 'नगरपालिका अधिकारी लॉगिन',
    adminLoginSub: 'नगरपालिका आयुक्त एवं विभागाध्यक्षों हेतु सुरक्षित पोर्टल',
    adminEmailLabel: 'आधिकारिक ईमेल पता',
    adminPasswordLabel: 'पासवर्ड',
    adminSignInBtn: 'विभाग पोर्टल में लॉगिन करें →',
    adminDemoCredentialsTitle: 'डेमो क्रेडेंशियल्स (मूल्यांकन हेतु)',
    adminFillAndSignIn: 'साइन इन',
    adminMfaCodeLabel: '6 अंकों का MFA सत्यापन कोड दर्ज करें',
    adminMfaVerifyBtn: 'सत्यापित करें एवं लॉगिन करें →',

    notificationsTitle: 'नागरिक सूचना केंद्र',
    markAllReadBtn: 'सभी को पढ़ा हुआ चिह्नित करें',
    noNotifications: 'फिलहाल कोई नई सूचना नहीं है।',
    channelInApp: 'ऐप सूचना',
    channelEmail: 'ईमेल भेजा गया',
    channelSms: 'SMS कतार में',

    forgotPassword: 'पासवर्ड भूल गए?',
    resetPasswordTitle: 'पासवर्ड रीसेट',
    sendOtpBtn: 'ओटीपी भेजें',
    resetPasswordBtn: 'पासवर्ड रीसेट करें',
    otpLabel: '6-अंकीय ओटीपी दर्ज करें',
    newPasswordLabel: 'नया पासवर्ड',
    confirmPasswordLabel: 'पासवर्ड की पुष्टि करें',
    backToLogin: 'वापस लॉगिन करें',

    deleteSelected: 'चयनित हटाएं',
    selectAll: 'सभी चुनें',
  },
};

// ==========================================
// Dynamic Term Translation Helpers
// ==========================================

export function translateStatus(status: string, lang: Language): string {
  if (lang === 'ta') {
    switch (status) {
      case 'Reported': return 'பதிவு செய்யப்பட்டது';
      case 'In Progress': return 'நடவடிக்கையில் உள்ளது';
      case 'Resolved': return 'தீர்க்கப்பட்டது';
      case 'Rejected': return 'நிராகரிக்கப்பட்டது';
      default: return status;
    }
  }
  if (lang === 'hi') {
    switch (status) {
      case 'Reported': return 'दर्ज की गई';
      case 'In Progress': return 'प्रगति पर है';
      case 'Resolved': return 'समाधान हो गया';
      case 'Rejected': return 'अस्वीकृत';
      default: return status;
    }
  }
  return status;
}

export function translatePriority(priority: string, lang: Language): string {
  if (lang === 'ta') {
    switch (priority) {
      case 'Critical': return 'மிக அவசரம்';
      case 'High': return 'அதிக முன்னுரிமை';
      case 'Medium': return 'நடுத்தர முன்னுரிமை';
      case 'Low': return 'குறைந்த முன்னுரிமை';
      default: return priority;
    }
  }
  if (lang === 'hi') {
    switch (priority) {
      case 'Critical': return 'अति गंभीर';
      case 'High': return 'उच्च प्राथमिकता';
      case 'Medium': return 'मध्यम प्राथमिकता';
      case 'Low': return 'सामान्य प्राथमिकता';
      default: return priority;
    }
  }
  return priority;
}

export function translateCategory(category: string, lang: Language): string {
  if (lang === 'ta') {
    switch (category) {
      case 'Road & Potholes': return 'சாலை மற்றும் பள்ளங்கள்';
      case 'Water Leakage & Supply': return 'குடிநீர் கசிவு மற்றும் விநியோகம்';
      case 'Garbage & Sanitation': return 'குப்பை மற்றும் துப்புரவு';
      case 'Streetlights & Power': return 'தெருவிளக்கு மற்றும் மின்சாரம்';
      case 'Public Safety': return 'பொது பாதுகாப்பு';
      case 'Other': return 'இதர புகார்கள்';
      default: return category;
    }
  }
  if (lang === 'hi') {
    switch (category) {
      case 'Road & Potholes': return 'सड़क और गड्ढे';
      case 'Water Leakage & Supply': return 'जल रिसाव और आपूर्ति';
      case 'Garbage & Sanitation': return 'कचरा और स्वच्छता';
      case 'Streetlights & Power': return 'स्ट्रीटलाइट और बिजली';
      case 'Public Safety': return 'सार्वजनिक सुरक्षा';
      case 'Other': return 'अन्य समस्याएं';
      default: return category;
    }
  }
  return category;
}

export function translateDepartment(department: string, lang: Language): string {
  if (lang === 'ta') {
    if (department.includes('Works')) return 'பொதுப்பணித்துறை (PWD)';
    if (department.includes('Water')) return 'குடிநீர் வழங்கல் துறை';
    if (department.includes('Electricity')) return 'மின்சார வாரியம்';
    if (department.includes('Sanitation')) return 'துப்புரவு துறை';
    if (department.includes('Administration')) return 'நகராட்சி நிர்வாகம்';
  }
  if (lang === 'hi') {
    if (department.includes('Works')) return 'लोक निर्माण विभाग (PWD)';
    if (department.includes('Water')) return 'जल आपूर्ति विभाग';
    if (department.includes('Electricity')) return 'विद्युत विभाग';
    if (department.includes('Sanitation')) return 'स्वच्छता विभाग';
    if (department.includes('Administration')) return 'नगरपालिका प्रशासन';
  }
  return department;
}

export function translateBadge(badge: string, lang: Language): string {
  if (lang === 'ta') {
    if (badge.includes('Distinguished')) return '🥇 முதன்மை குடிமக்கள் பங்களிப்பாளர்';
    if (badge.includes('Senior')) return '🥈 மூத்த குடிமக்கள் பங்களிப்பாளர்';
    if (badge.includes('Active')) return '🥉 செயலில் உள்ள பங்களிப்பாளர்';
    return 'உறுதிப்படுத்தப்பட்ட குடிமகன்';
  }
  if (lang === 'hi') {
    if (badge.includes('Distinguished')) return '🥇 विशिष्ट नागरिक योगदानकर्ता';
    if (badge.includes('Senior')) return '🥈 वरिष्ठ नागरिक योगदानकर्ता';
    if (badge.includes('Active')) return '🥉 सक्रिय नागरिक योगदानकर्ता';
    return 'सत्यापित नागरिक';
  }
  if (badge.includes('Distinguished')) return '🥇 Distinguished Civic Contributor';
  if (badge.includes('Senior')) return '🥈 Senior Civic Contributor';
  if (badge.includes('Active')) return '🥉 Active Civic Contributor';
  return 'Verified Citizen';
}

export const SEEDED_ISSUE_TRANSLATIONS: Record<Language, Record<string, string>> = {
  en: {},
  ta: {
    'Massive Pothole on MG Road': 'எம்.ஜி சாலையில் பெரிய பள்ளம்',
    'A large pothole approximately 3 feet wide and 1 foot deep has formed on MG Road near the central junction. Multiple vehicles have been damaged and two-wheeler riders are at serious risk.':
      'மத்திய சந்திப்பு அருகே எம்.ஜி சாலையில் சுமார் 3 அடி அகலமும் 1 அடி ஆழமும் கொண்ட ஒரு பெரிய பள்ளம் ஏற்பட்டுள்ளது. பல வாகனங்கள் சேதமடைந்துள்ளன, இருசக்கர வாகன ஓட்டிகள் பெரும் ஆபத்தில் உள்ளனர்.',
    'MG Road, Central Junction, Near City Mall': 'எம்.ஜி சாலை, மத்திய சந்திப்பு, சிட்டி மால் அருகில்',
    'Critical road hazard: 3-foot wide pothole on MG Road near central junction.':
      'அவசர சாலை ஆபத்து: மத்திய சந்திப்பு அருகே எம்.ஜி சாலையில் 3 அடி அகல பள்ளம்.',
    'Immediate cold-mix patch followed by permanent asphalt overlay.':
      'உடனடி கோல்ட்-மிக்ஸ் பேட்ச் மற்றும் அதைத் தொடர்ந்து நிரந்தர தார் போடுதல்.',

    'Overflowing Garbage Bins Near Central Market': 'சென்ட்ரல் மார்க்கெட் அருகே வழியும் குப்பைத் தொட்டிகள்',
    'The garbage bins outside the Central Market have not been cleared for over 4 days. Trash is overflowing onto the sidewalk creating health hazards and attracting stray dogs.':
      'சென்ட்ரல் மார்க்கெட்டுக்கு வெளியே உள்ள குப்பைத் தொட்டிகள் 4 நாட்களுக்கும் மேலாக அகற்றப்படவில்லை. நடைபாதையில் குப்பைகள் வழிந்து சுகாதார சீர்கேட்டை ஏற்படுத்தி தெரு நாய்களை ஈர்க்கிறது.',
    'Central Market, Main Entrance, Ward 12': 'சென்ட்ரல் மார்க்கெட், பிரதான நுழைவாயில், வார்டு 12',
    'Overflowing commercial waste bins at market entrance requiring immediate compactor truck dispatch.':
      'சந்தை நுழைவாயிலில் வழியும் வணிக குப்பைத் தொட்டிகள்; உடனடி குப்பை லாரி தேவை.',
    'Dispatch mechanical refuse truck and sanitize bin surroundings with lime powder.':
      'இயந்திர குப்பை லாரியை அனுப்பி தொட்டிப் பகுதியை கிருமிநாசினி பவுடர் மூலம் சுத்தம் செய்தல்.',

    'Broken Streetlight on 5th Avenue': '5வது அவென்யூவில் பழுதடைந்த தெருவிளக்கு',
    'Streetlight pole #ST-547 on 5th Avenue near the park entrance has been non-functional for past 5 days. Complete darkness causes safety concerns for evening pedestrians and women commuters.':
      'பூங்கா நுழைவாயில் அருகே 5வது அவென்யூவில் உள்ள தெருவிளக்கு கம்பம் #ST-547 கடந்த 5 நாட்களாக எரியவில்லை. மாலை நேர பாதசாரிகள் மற்றும் பெண்கள் பாதுகாப்புக்கு அச்சுறுத்தலாக உள்ளது.',
    '5th Avenue, Near City Park Entrance, Sector 7': '5வது அவென்யூ, சிட்டி பார்க் நுழைவாயில் அருகில், செக்டார் 7',
    'Faulty streetlight pole #ST-547 causing dark corridor near public park.':
      'பழுதடைந்த தெருவிளக்கு #ST-547 பூங்கா அருகே இருளை ஏற்படுத்துகிறது.',
    'Replace 120W LED fixture and inspect underground line connection.':
      '120W LED விளக்கை மாற்றி நிலத்தடி மின் இணைப்பை ஆய்வு செய்தல்.',

    'Water Pipeline Leak at Gandhi Nagar': 'காந்தி நகரில் குடிநீர் குழாய் கசிவு',
    'A major 8-inch water distribution pipeline is ruptured at Gandhi Nagar intersection. Thousands of liters of potable water are being wasted hourly, causing low tap pressure across Ward 4.':
      'காந்தி நகர் சந்திப்பில் பிரதான 8 அங்குல குடிநீர் விநியோக குழாய் உடைந்துள்ளது. மணிக்கு ஆயிரக்கணக்கான லிட்டர் குடிநீர் வீணாகி, வார்டு 4 முழுவதும் குறைந்த அழுத்தத்தை ஏற்படுத்துகிறது.',
    'Gandhi Nagar, Intersection with Nehru Street, Block C': 'காந்தி நகர், நேரு வீதி சந்திப்பு, பிளாக் சி',
    'Critical distribution pipe burst at Gandhi Nagar junction causing road submergence.':
      'காந்தி நகர் சந்திப்பில் பிரதான குடிநீர் குழாய் உடைந்து சாலை மூழ்கியது.',
    'Isolate upstream sluice valve, excavate leak point, and weld replacement collar clamp.':
      'மேல்நிலை வால்வை மூடி, கசிவு பகுதியை தோண்டி, புதிய காலர் கிளாம்ப் வெல்டிங் செய்தல்.',

    'Damaged Road Divider on NH-48': 'தேசிய நெடுஞ்சாலை 48ல் சேதமடைந்த சாலை தடுப்பு',
    'Concrete median barrier fractured with heavy rubble thrown across the fast lane on NH-48 near Toll Plaza. Motorists forced into abrupt swerves.':
      'சுங்கச்சாவடி அருகே NH-48ல் கான்கிரீட் தடுப்பு உடைந்து இடிபாடுகள் வேகப்பாதையில் சிதறிக் கிடக்கின்றன. வாகன ஓட்டிகள் திடீரென திரும்ப வேண்டியுள்ளது.',
    'NH-48, Near Toll Plaza, KM 42': 'தேசிய நெடுஞ்சாலை 48, சுங்கச்சாவடி அருகில், கி.மீ 42',
    'Shattered highway median barrier obstructing overtaking lane near toll gate.':
      'சுங்கச்சாவடி அருகே வேகப்பாதையை தடுக்கும் சேதமடைந்த நெடுஞ்சாலை தடுப்பு.',
    'Deploy reflective lane cones, clear debris immediately, and install precast Jersey barriers.':
      'பிரதிபலிப்பு கூம்புகளை அமைத்து, இடிபாடுகளை உடனடியாக அகற்றி, புதிய தடுப்பு அமைத்தல்.',

    'Open Drainage Cover Near School Zone': 'பள்ளி பகுதியில் திறந்திருக்கும் சாக்கடை மூடி',
    'A large 2.5-foot stormwater manhole cover is completely missing on Park Street right outside St. Mary’s Primary School. Severe fatal hazard for young students during dismissal hours.':
      'செயின்ட் மேரிஸ் தொடக்கப்பள்ளிக்கு வெளியே பார்க் தெருவில் 2.5 அடி மழைநீர் வடிகால் மூடி காணாமல் போயுள்ளது. பள்ளி முடியும் நேரத்தில் சிறு குழந்தைகளுக்கு பெரும் ஆபத்து.',
    'Park Street, Near St. Mary’s School, Ward 5': 'பார்க் தெரு, செயின்ட் மேரிஸ் பள்ளி அருகில், வார்டு 5',
    'Immediate life hazard: open drainage manhole outside elementary school entrance.':
      'உடனடி உயிருக்கு ஆபத்து: தொடக்கப்பள்ளி நுழைவாயிலில் திறந்திருக்கும் சாக்கடை மேன்ஹோல்.',
    'Install heavy-duty ductile iron manhole cover and construct safety barricading.':
      'உறுதியான இரும்பு மேன்ஹோல் மூடியை பொருத்தி பாதுகாப்பு தடுப்பு அமைத்தல்.',

    'Ruptured Water Meter at Green Valley': 'கிரீன் வேலி பகுதியில் உடைந்த குடிநீர் மீட்டா்',
    'Distribution water meter cracked and spurting water across apartment entrance sidewalk. Potable water wastage and pedestrian slippery hazard.':
      'குடிநீர் விநியோக மீட்டர் உடைந்து அடுக்குமாடி குடியிருப்பு நுழைவு நடைபாதையில் தண்ணீர் பீறிட்டு பாய்கிறது. குடிநீர் வீணாவதுடன் பாதசாரிகளுக்கு வழுக்கும் ஆபத்து உள்ளது.',
    'Green Valley Apartments, Phase 2 Entrance': 'கிரீன் வேலி அடுக்குமாடி குடியிருப்பு, கட்டம் 2 நுழைவாயில்',

    'High-Voltage Cable Insulation Exposed on Cross Road': 'குறுக்கு சாலையில் திறந்த நிலையில் உள்ள உயர் அழுத்த மின் கேபிள்',
    'Underground junction box cover dislodged exposing heavy 440V distribution lines right beside pedestrian bus shelter.':
      'பாதசாரி பேருந்து நிழற்குடை அருகே நிலத்தடி இணைப்புப் பெட்டி மூடி விலகி 440V விநியோக மின் இணைப்புகள் திறந்த நிலையில் ஆபத்தை ஏற்படுத்துகின்றன.',
    'Cross Road 4, Bus Shelter Junction': 'குறுக்கு சாலை 4, பேருந்து நிறுத்த சந்திப்பு',

    'Commercial Waste Cleared from Shastri Nagar': 'சாஸ்திரி நகரில் வணிகக் கழிவுகள் அகற்றப்பட்டன',
    'Bulk construction debris and commercial boxes dumped illegally on Shastri Nagar playground corner. Dust and safety hazard for playing children.':
      'சாஸ்திரி நகர் விளையாட்டு மைதான மூலையில் சட்டவிரோதமாகக் கொட்டப்பட்ட கட்டுமானக் கழிவுகள் மற்றும் வணிகப் பெட்டிகள். விளையாடும் குழந்தைகளுக்கு தூசி மற்றும் பாதுகாப்பு அச்சுறுத்தல்.',
    'Shastri Nagar Municipal Playground, North Corner': 'சாஸ்திரி நகர் மாநகராட்சி விளையாட்டு மைதானம், வடக்கு மூலை',

    'Missing Community Center Railing Replaced': 'சமூகக் கூடத்தில் உடைந்த கைப்பிடி கம்பி மாற்றப்பட்டது',
    'Broken handrail along steep entrance stairs at Ward 9 Community Hall. Elderly citizens unable to climb steps safely for pension distribution.':
      'வார்டு 9 சமுதாயக் கூடத்தின் செங்குத்தான நுழைவுப் படிக்கட்டுகளில் உடைந்த கைப்பிடி கம்பி. ஓய்வூதியம் பெற வரும் முதியவர்கள் படிக்கட்டுகளில் பாதுகாப்பாக ஏற முடியவில்லை.',
    'Ward 9 Municipal Community Hall, Main Steps': 'வார்டு 9 மாநகராட்சி சமுதாயக் கூடம், பிரதான படிக்கட்டுகள்',

    'Water Main Burst on Marina Radial Road': 'மெரினா ரேடியல் சாலையில் பிரதான குடிநீர்க் குழாய் உடைப்பு',
    'Major water pipeline rupture causing severe flooding on Marina Radial road.':
      'மெரினா ரேடியல் சாலையில் பெரும் வெள்ளப்பெருக்கை ஏற்படுத்திய பிரதான குடிநீர்க் குழாய் வெடிப்பு.',
    'Marina Beach Road, Chennai': 'மெரினா கடற்கரை சாலை, சென்னை',

    'Broken Streetlamp Outside Ward 4 Community Centre': 'வார்டு 4 சமூகக் கூடத்திற்கு வெளியே பழுதடைந்த தெருவிளக்கு',
    'Streetlamp completely dead causing dark zone hazard on cross street.':
      'தெருவிளக்கு முற்றிலும் எரியாமல் குறுக்குத் தெருவில் இருள் சூழ்ந்து ஆபத்தை ஏற்படுத்துகிறது.',
    'Ward 4 Community Centre, Zone 2': 'வார்டு 4 சமூக நலக்கூடம், மண்டலம் 2',
  },
  hi: {
    'Massive Pothole on MG Road': 'एमजी रोड पर गहरा गड्ढा',
    'A large pothole approximately 3 feet wide and 1 foot deep has formed on MG Road near the central junction. Multiple vehicles have been damaged and two-wheeler riders are at serious risk.':
      'सेंट्रल जंक्शन के पास एमजी रोड पर लगभग 3 फीट चौड़ा और 1 फीट गहरा गड्ढा हो गया है। कई वाहन क्षतिग्रस्त हुए हैं और दोपहिया वाहन चालकों के लिए गंभीर खतरा बना हुआ है।',
    'MG Road, Central Junction, Near City Mall': 'एमजी रोड, सेंट्रल जंक्शन, सिटी मॉल के पास',
    'Critical road hazard: 3-foot wide pothole on MG Road near central junction.':
      'गंभीर सड़क खतरा: सेंट्रल जंक्शन के पास एमजी रोड पर 3 फीट चौड़ा गड्ढा।',
    'Immediate cold-mix patch followed by permanent asphalt overlay.':
      'तत्काल कोल्ड-मिक्स पैच और उसके बाद स्थायी डामरीकरण।',

    'Overflowing Garbage Bins Near Central Market': 'सेंट्रल मार्केट के पास कचरे के डिब्बे ओवरफ्लो',
    'The garbage bins outside the Central Market have not been cleared for over 4 days. Trash is overflowing onto the sidewalk creating health hazards and attracting stray dogs.':
      'सेंट्रल मार्केट के बाहर कचरे के डिब्बे 4 दिनों से अधिक समय से साफ नहीं किए गए हैं। कचरा फुटपाथ पर फैल रहा है, जिससे स्वास्थ्य संबंधी खतरे पैदा हो रहे हैं।',
    'Central Market, Main Entrance, Ward 12': 'सेंट्रल मार्केट, मुख्य प्रवेश द्वार, वार्ड 12',
    'Overflowing commercial waste bins at market entrance requiring immediate compactor truck dispatch.':
      'मार्केट प्रवेश द्वार पर ओवरफ्लो हो रहे कचरे के डिब्बे, तुरंत गाड़ी भेजने की आवश्यकता।',
    'Dispatch mechanical refuse truck and sanitize bin surroundings with lime powder.':
      'कचरा उठाने वाला वाहन भेजें और चूना पाउडर से आसपास की जगह को कीटाणुरहित करें।',

    'Broken Streetlight on 5th Avenue': '5वीं एवेन्यू पर टूटी हुई स्ट्रीटलाइट',
    'Streetlight pole #ST-547 on 5th Avenue near the park entrance has been non-functional for past 5 days. Complete darkness causes safety concerns for evening pedestrians and women commuters.':
      'पार्क के प्रवेश द्वार के पास 5वीं एवेन्यू पर स्ट्रीटलाइट पोल #ST-547 पिछले 5 दिनों से खराब है। अंधेरे के कारण शाम के यात्रियों और महिलाओं के लिए सुरक्षा चिंताएं पैदा हो रही हैं।',
    '5th Avenue, Near City Park Entrance, Sector 7': '5वीं एवेन्यू, सिटी पार्क प्रवेश द्वार के पास, सेक्टर 7',
    'Faulty streetlight pole #ST-547 causing dark corridor near public park.':
      'खराब स्ट्रीटलाइट पोल #ST-547 सार्वजनिक पार्क के पास अंधेरे का कारण बन रहा है।',
    'Replace 120W LED fixture and inspect underground line connection.':
      '120W एलईडी लाइट बदलें और भूमिगत लाइन कनेक्शन की जांच करें।',

    'Water Pipeline Leak at Gandhi Nagar': 'गांधी नगर में पानी की पाइपलाइन में रिसाव',
    'A major 8-inch water distribution pipeline is ruptured at Gandhi Nagar intersection. Thousands of liters of potable water are being wasted hourly, causing low tap pressure across Ward 4.':
      'गांधी नगर चौराहे पर एक मुख्य 8 इंच की जल वितरण पाइपलाइन फट गई है। प्रति घंटे हजारों लीटर पीने योग्य पानी बर्बाद हो रहा है, जिससे वार्ड 4 में पानी का दबाव कम हो गया है।',
    'Gandhi Nagar, Intersection with Nehru Street, Block C': 'गांधी नगर, नेहरू स्ट्रीट चौराहा, ब्लॉक सी',
    'Critical distribution pipe burst at Gandhi Nagar junction causing road submergence.':
      'गांधी नगर जंक्शन पर मुख्य जल पाइपलाइन फटने से सड़क जलमग्न।',
    'Isolate upstream sluice valve, excavate leak point, and weld replacement collar clamp.':
      'वाल्व बंद करें, रिसाव बिंदु की खुदाई करें और नया कॉलर क्लैंप लगाएं।',

    'Damaged Road Divider on NH-48': 'एनएच-48 पर क्षतिग्रस्त रोड डिवाइडर',
    'Concrete median barrier fractured with heavy rubble thrown across the fast lane on NH-48 near Toll Plaza. Motorists forced into abrupt swerves.':
      'टोल प्लाजा के पास एनएच-48 पर कंक्रीट डिवाइडर टूट गया है और मलबा तेज लेन में फैल गया है। वाहन चालकों को अचानक मुड़ना पड़ रहा है।',
    'NH-48, Near Toll Plaza, KM 42': 'एनएच-48, टोल प्लाजा के पास, किमी 42',
    'Shattered highway median barrier obstructing overtaking lane near toll gate.':
      'टोल गेट के पास ओवरटेकिंग लेन को बाधित करने वाला टूटा हुआ हाईवे डिवाइडर।',
    'Deploy reflective lane cones, clear debris immediately, and install precast Jersey barriers.':
      'रिफ्लेक्टिव कोन लगाएं, मलबा तुरंत साफ करें और कंक्रीट बैरियर लगाएं।',

    'Open Drainage Cover Near School Zone': 'स्कूल क्षेत्र के पास खुला ड्रेनेज ढक्कन',
    'A large 2.5-foot stormwater manhole cover is completely missing on Park Street right outside St. Mary’s Primary School. Severe fatal hazard for young students during dismissal hours.':
      'सेंट मैरी प्राइमरी स्कूल के बाहर पार्क स्ट्रीट पर 2.5 फीट का मैनहोल कवर गायब है। स्कूल की छुट्टी के समय छोटे छात्रों के लिए जानलेवा खतरा है।',
    'Park Street, Near St. Mary’s School, Ward 5': 'पार्क स्ट्रीट, सेंट मैरी स्कूल के पास, वार्ड 5',
    'Immediate life hazard: open drainage manhole outside elementary school entrance.':
      'तत्काल जीवन खतरा: प्राथमिक विद्यालय के प्रवेश द्वार के बाहर खुला मैनहोल।',
    'Install heavy-duty ductile iron manhole cover and construct safety barricading.':
      'मजबूत लोहे का मैनहोल कवर लगाएं और सुरक्षा बैरिकेडिंग बनाएं।',

    'Ruptured Water Meter at Green Valley': 'ग्रीन वैली में टूटा हुआ पानी का मीटर',
    'Distribution water meter cracked and spurting water across apartment entrance sidewalk. Potable water wastage and pedestrian slippery hazard.':
      'वितरण जल मीटर टूट गया है और अपार्टमेंट प्रवेश द्वार के फुटपाथ पर पानी बह रहा है। पीने के पानी की बर्बादी और पैदल यात्रियों के लिए फिसलन का खतरा।',
    'Green Valley Apartments, Phase 2 Entrance': 'ग्रीन वैली अपार्टमेंट्स, फेज 2 प्रवेश द्वार',

    'High-Voltage Cable Insulation Exposed on Cross Road': 'क्रॉस रोड पर खुला हाई-वोल्टेज बिजली का केबल',
    'Underground junction box cover dislodged exposing heavy 440V distribution lines right beside pedestrian bus shelter.':
      'पैदल बस शेल्टर के ठीक बगल में भूमिगत जंक्शन बॉक्स का ढक्कन हट गया है, जिससे 440V बिजली लाइनें खुली हैं।',
    'Cross Road 4, Bus Shelter Junction': 'क्रॉस रोड 4, बस शेल्टर जंक्शन',

    'Commercial Waste Cleared from Shastri Nagar': 'शास्त्री नगर से वाणिज्यिक कचरा हटाया गया',
    'Bulk construction debris and commercial boxes dumped illegally on Shastri Nagar playground corner. Dust and safety hazard for playing children.':
      'शास्त्री नगर खेल के मैदान के कोने में भारी निर्माण मलबा और वाणिज्यिक बक्से अवैध रूप से फेंके गए। बच्चों के लिए धूल और सुरक्षा जोखिम।',
    'Shastri Nagar Municipal Playground, North Corner': 'शास्त्री नगर नगर निगम खेल का मैदान, उत्तरी कोना',

    'Missing Community Center Railing Replaced': 'सामुदायिक केंद्र की टूटी हुई रेलिंग बदली गई',
    'Broken handrail along steep entrance stairs at Ward 9 Community Hall. Elderly citizens unable to climb steps safely for pension distribution.':
      'वार्ड 9 सामुदायिक भवन की सीढ़ियों पर टूटी हुई रेलिंग। पेंशन वितरण के लिए बुजुर्ग नागरिक सुरक्षित सीढ़ियां नहीं चढ़ पा रहे।',
    'Ward 9 Municipal Community Hall, Main Steps': 'वार्ड 9 नगर निगम सामुदायिक भवन, मुख्य सीढ़ियां',

    'Water Main Burst on Marina Radial Road': 'मरीना रेडियल रोड पर मुख्य पानी की पाइपलाइन फटी',
    'Major water pipeline rupture causing severe flooding on Marina Radial road.':
      'मरीना रेडियल रोड पर गंभीर जलभराव का कारण बनी मुख्य पानी की पाइपलाइन फटना।',
    'Marina Beach Road, Chennai': 'मरीना बीच रोड, चेन्नई',

    'Broken Streetlamp Outside Ward 4 Community Centre': 'वार्ड 4 सामुदायिक केंद्र के बाहर खराब स्ट्रीटलाइट',
    'Streetlamp completely dead causing dark zone hazard on cross street.':
      'स्ट्रीटलाइट पूरी तरह खराब होने से क्रॉस स्ट्रीट पर अंधेरे का खतरा।',
    'Ward 4 Community Centre, Zone 2': 'वार्ड 4 सामुदायिक केंद्र, जोन 2',
  },
};

export function getFallbackIssueTranslation(text: string, lang: Language): string {
  if (lang === 'en' || !text) return text;
  return SEEDED_ISSUE_TRANSLATIONS[lang]?.[text.trim()] || text;
}
