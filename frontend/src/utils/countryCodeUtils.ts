// Country codes with mobile number digit limits
// Format: "countryCode": { min: minDigits, max: maxDigits }
// Note: These limits are for the local mobile number (excluding country code)

const countryMobileLimits = {
  // North America
  1: { min: 10, max: 10 }, // USA, Canada (including area code)

  // Europe
  33: { min: 9, max: 9 }, // France
  34: { min: 9, max: 9 }, // Spain
  39: { min: 9, max: 10 }, // Italy
  41: { min: 9, max: 9 }, // Switzerland
  43: { min: 10, max: 11 }, // Austria
  44: { min: 10, max: 10 }, // United Kingdom
  45: { min: 8, max: 8 }, // Denmark
  46: { min: 7, max: 9 }, // Sweden
  47: { min: 8, max: 8 }, // Norway
  48: { min: 9, max: 9 }, // Poland
  49: { min: 10, max: 11 }, // Germany
  31: { min: 9, max: 9 }, // Netherlands
  32: { min: 9, max: 9 }, // Belgium
  36: { min: 9, max: 9 }, // Hungary
  358: { min: 9, max: 10 }, // Finland
  420: { min: 9, max: 9 }, // Czech Republic
  421: { min: 9, max: 9 }, // Slovakia
  351: { min: 9, max: 9 }, // Portugal
  30: { min: 10, max: 10 }, // Greece
  7: { min: 10, max: 10 }, // Russia, Kazakhstan
  380: { min: 9, max: 9 }, // Ukraine
  40: { min: 10, max: 10 }, // Romania
  359: { min: 8, max: 9 }, // Bulgaria
  385: { min: 8, max: 9 }, // Croatia
  386: { min: 8, max: 8 }, // Slovenia
  381: { min: 8, max: 9 }, // Serbia
  382: { min: 8, max: 8 }, // Montenegro
  387: { min: 8, max: 8 }, // Bosnia and Herzegovina
  389: { min: 8, max: 8 }, // North Macedonia
  355: { min: 9, max: 9 }, // Albania
  372: { min: 7, max: 8 }, // Estonia
  371: { min: 8, max: 8 }, // Latvia
  370: { min: 8, max: 8 }, // Lithuania
  375: { min: 9, max: 9 }, // Belarus
  373: { min: 8, max: 8 }, // Moldova
  353: { min: 9, max: 9 }, // Ireland
  354: { min: 7, max: 7 }, // Iceland
  352: { min: 9, max: 9 }, // Luxembourg
  377: { min: 8, max: 9 }, // Monaco
  378: { min: 9, max: 10 }, // San Marino
  376: { min: 6, max: 6 }, // Andorra
  423: { min: 7, max: 7 }, // Liechtenstein
  350: { min: 8, max: 8 }, // Gibraltar
  356: { min: 8, max: 8 }, // Malta
  357: { min: 8, max: 8 }, // Cyprus

  // Asia-Pacific
  86: { min: 11, max: 11 }, // China
  91: { min: 10, max: 10 }, // India
  81: { min: 10, max: 11 }, // Japan
  82: { min: 10, max: 11 }, // South Korea
  65: { min: 8, max: 8 }, // Singapore
  60: { min: 7, max: 10 }, // Malaysia
  66: { min: 9, max: 9 }, // Thailand
  84: { min: 9, max: 10 }, // Vietnam
  62: { min: 8, max: 12 }, // Indonesia
  63: { min: 10, max: 10 }, // Philippines
  95: { min: 8, max: 9 }, // Myanmar
  855: { min: 8, max: 9 }, // Cambodia
  856: { min: 8, max: 10 }, // Laos
  673: { min: 7, max: 7 }, // Brunei
  670: { min: 7, max: 8 }, // East Timor
  61: { min: 9, max: 9 }, // Australia
  64: { min: 8, max: 9 }, // New Zealand
  93: { min: 9, max: 9 }, // Afghanistan
  880: { min: 10, max: 10 }, // Bangladesh
  975: { min: 8, max: 8 }, // Bhutan
  98: { min: 10, max: 10 }, // Iran
  964: { min: 10, max: 10 }, // Iraq
  972: { min: 9, max: 9 }, // Israel
  962: { min: 9, max: 9 }, // Jordan
  996: { min: 9, max: 9 }, // Kyrgyzstan
  961: { min: 7, max: 8 }, // Lebanon
  960: { min: 7, max: 7 }, // Maldives
  976: { min: 8, max: 8 }, // Mongolia
  977: { min: 10, max: 10 }, // Nepal
  850: { min: 10, max: 10 }, // North Korea
  92: { min: 10, max: 10 }, // Pakistan
  970: { min: 9, max: 9 }, // Palestine
  974: { min: 8, max: 8 }, // Qatar
  966: { min: 9, max: 9 }, // Saudi Arabia
  94: { min: 7, max: 9 }, // Sri Lanka
  963: { min: 9, max: 9 }, // Syria
  992: { min: 9, max: 9 }, // Tajikistan
  90: { min: 10, max: 10 }, // Turkey
  993: { min: 8, max: 8 }, // Turkmenistan
  971: { min: 9, max: 9 }, // UAE
  998: { min: 9, max: 9 }, // Uzbekistan
  967: { min: 9, max: 9 }, // Yemen

  // Middle East & Africa
  20: { min: 10, max: 10 }, // Egypt
  27: { min: 9, max: 9 }, // South Africa
  234: { min: 8, max: 10 }, // Nigeria
  254: { min: 9, max: 10 }, // Kenya
  256: { min: 9, max: 9 }, // Uganda
  255: { min: 9, max: 9 }, // Tanzania
  233: { min: 9, max: 10 }, // Ghana
  251: { min: 9, max: 9 }, // Ethiopia
  212: { min: 9, max: 9 }, // Morocco
  213: { min: 9, max: 9 }, // Algeria
  216: { min: 8, max: 8 }, // Tunisia
  218: { min: 10, max: 10 }, // Libya
  249: { min: 9, max: 9 }, // Sudan
  211: { min: 9, max: 9 }, // South Sudan
  252: { min: 7, max: 9 }, // Somalia
  253: { min: 8, max: 8 }, // Djibouti
  291: { min: 7, max: 7 }, // Eritrea
  260: { min: 9, max: 9 }, // Zambia
  263: { min: 9, max: 9 }, // Zimbabwe
  265: { min: 7, max: 9 }, // Malawi
  266: { min: 8, max: 8 }, // Lesotho
  267: { min: 7, max: 8 }, // Botswana
  268: { min: 8, max: 8 }, // Eswatini
  269: { min: 7, max: 7 }, // Comoros

  // South America
  55: { min: 10, max: 11 }, // Brazil
  54: { min: 10, max: 10 }, // Argentina
  56: { min: 9, max: 9 }, // Chile
  57: { min: 10, max: 10 }, // Colombia
  51: { min: 9, max: 9 }, // Peru
  58: { min: 7, max: 10 }, // Venezuela
  593: { min: 9, max: 9 }, // Ecuador
  591: { min: 8, max: 8 }, // Bolivia
  595: { min: 9, max: 9 }, // Paraguay
  598: { min: 8, max: 9 }, // Uruguay
  597: { min: 7, max: 7 }, // Suriname
  592: { min: 7, max: 7 }, // Guyana
  594: { min: 9, max: 9 }, // French Guiana

  // Central America & Caribbean
  52: { min: 10, max: 10 }, // Mexico
  503: { min: 8, max: 8 }, // El Salvador
  502: { min: 8, max: 8 }, // Guatemala
  504: { min: 8, max: 8 }, // Honduras
  505: { min: 8, max: 8 }, // Nicaragua
  506: { min: 8, max: 8 }, // Costa Rica
  507: { min: 8, max: 8 }, // Panama
  501: { min: 7, max: 7 }, // Belize
  53: { min: 8, max: 8 }, // Cuba
  590: { min: 9, max: 9 }, // Guadeloupe
  596: { min: 9, max: 9 }, // Martinique
  599: { min: 7, max: 7 }, // Netherlands Antilles
};

const countryInfo: Record<number, { name: string; flag: string }> = {
  1: { name: "USA/Canada", flag: "🇺🇸" },
  7: { name: "Russia", flag: "🇷🇺" },
  20: { name: "Egypt", flag: "🇪🇬" },
  27: { name: "South Africa", flag: "🇿🇦" },
  30: { name: "Greece", flag: "🇬🇷" },
  31: { name: "Netherlands", flag: "🇳🇱" },
  32: { name: "Belgium", flag: "🇧🇪" },
  33: { name: "France", flag: "🇫🇷" },
  34: { name: "Spain", flag: "🇪🇸" },
  36: { name: "Hungary", flag: "🇭🇺" },
  39: { name: "Italy", flag: "🇮🇹" },
  40: { name: "Romania", flag: "🇷🇴" },
  41: { name: "Switzerland", flag: "🇨🇭" },
  43: { name: "Austria", flag: "🇦🇹" },
  44: { name: "United Kingdom", flag: "🇬🇧" },
  45: { name: "Denmark", flag: "🇩🇰" },
  46: { name: "Sweden", flag: "🇸🇪" },
  47: { name: "Norway", flag: "🇳🇴" },
  48: { name: "Poland", flag: "🇵🇱" },
  49: { name: "Germany", flag: "🇩🇪" },
  51: { name: "Peru", flag: "🇵🇪" },
  52: { name: "Mexico", flag: "🇲🇽" },
  53: { name: "Cuba", flag: "🇨🇺" },
  54: { name: "Argentina", flag: "🇦🇷" },
  55: { name: "Brazil", flag: "🇧🇷" },
  56: { name: "Chile", flag: "🇨🇱" },
  57: { name: "Colombia", flag: "🇨🇴" },
  58: { name: "Venezuela", flag: "🇻🇪" },
  60: { name: "Malaysia", flag: "🇲🇾" },
  61: { name: "Australia", flag: "🇦🇺" },
  62: { name: "Indonesia", flag: "🇮🇩" },
  63: { name: "Philippines", flag: "🇵🇭" },
  64: { name: "New Zealand", flag: "🇳🇿" },
  65: { name: "Singapore", flag: "🇸🇬" },
  66: { name: "Thailand", flag: "🇹🇭" },
  81: { name: "Japan", flag: "🇯🇵" },
  82: { name: "South Korea", flag: "🇰🇷" },
  84: { name: "Vietnam", flag: "🇻🇳" },
  86: { name: "China", flag: "🇨🇳" },
  90: { name: "Turkey", flag: "🇹🇷" },
  91: { name: "India", flag: "🇮🇳" },
  92: { name: "Pakistan", flag: "🇵🇰" },
  93: { name: "Afghanistan", flag: "🇦🇫" },
  94: { name: "Sri Lanka", flag: "🇱🇰" },
  95: { name: "Myanmar", flag: "🇲🇲" },
  98: { name: "Iran", flag: "🇮🇷" },
  212: { name: "Morocco", flag: "🇲🇦" },
  213: { name: "Algeria", flag: "🇩🇿" },
  216: { name: "Tunisia", flag: "🇹🇳" },
  218: { name: "Libya", flag: "🇱🇾" },
  233: { name: "Ghana", flag: "🇬🇭" },
  234: { name: "Nigeria", flag: "🇳🇬" },
  249: { name: "Sudan", flag: "🇸🇩" },
  251: { name: "Ethiopia", flag: "🇪🇹" },
  252: { name: "Somalia", flag: "🇸🇴" },
  254: { name: "Kenya", flag: "🇰🇪" },
  255: { name: "Tanzania", flag: "🇹🇿" },
  256: { name: "Uganda", flag: "🇺🇬" },
  260: { name: "Zambia", flag: "🇿🇲" },
  263: { name: "Zimbabwe", flag: "🇿🇼" },
  265: { name: "Malawi", flag: "🇲🇼" },
  267: { name: "Botswana", flag: "🇧🇼" },
  291: { name: "Eritrea", flag: "🇪🇷" },
  351: { name: "Portugal", flag: "🇵🇹" },
  352: { name: "Luxembourg", flag: "🇱🇺" },
  353: { name: "Ireland", flag: "🇮🇪" },
  354: { name: "Iceland", flag: "🇮🇸" },
  355: { name: "Albania", flag: "🇦🇱" },
  356: { name: "Malta", flag: "🇲🇹" },
  357: { name: "Cyprus", flag: "🇨🇾" },
  358: { name: "Finland", flag: "🇫🇮" },
  359: { name: "Bulgaria", flag: "🇧🇬" },
  370: { name: "Lithuania", flag: "🇱🇹" },
  371: { name: "Latvia", flag: "🇱🇻" },
  372: { name: "Estonia", flag: "🇪🇪" },
  373: { name: "Moldova", flag: "🇲🇩" },
  375: { name: "Belarus", flag: "🇧🇾" },
  376: { name: "Andorra", flag: "🇦🇩" },
  377: { name: "Monaco", flag: "🇲🇨" },
  378: { name: "San Marino", flag: "🇸🇲" },
  380: { name: "Ukraine", flag: "🇺🇦" },
  381: { name: "Serbia", flag: "🇷🇸" },
  382: { name: "Montenegro", flag: "🇲🇪" },
  385: { name: "Croatia", flag: "🇭🇷" },
  386: { name: "Slovenia", flag: "🇸🇮" },
  387: { name: "Bosnia and Herzegovina", flag: "🇧🇦" },
  389: { name: "North Macedonia", flag: "🇲🇰" },
  420: { name: "Czech Republic", flag: "🇨🇿" },
  421: { name: "Slovakia", flag: "🇸🇰" },
  423: { name: "Liechtenstein", flag: "🇱🇮" },
  501: { name: "Belize", flag: "🇧🇿" },
  502: { name: "Guatemala", flag: "🇬🇹" },
  503: { name: "El Salvador", flag: "🇸🇻" },
  504: { name: "Honduras", flag: "🇭🇳" },
  505: { name: "Nicaragua", flag: "🇳🇮" },
  506: { name: "Costa Rica", flag: "🇨🇷" },
  507: { name: "Panama", flag: "🇵🇦" },
  590: { name: "Guadeloupe", flag: "🇬🇵" },
  591: { name: "Bolivia", flag: "🇧🇴" },
  592: { name: "Guyana", flag: "🇬🇾" },
  593: { name: "Ecuador", flag: "🇪🇨" },
  594: { name: "French Guiana", flag: "🇬🇫" },
  595: { name: "Paraguay", flag: "🇵🇾" },
  596: { name: "Martinique", flag: "🇲🇶" },
  597: { name: "Suriname", flag: "🇸🇷" },
  598: { name: "Uruguay", flag: "🇺🇾" },
  599: { name: "Netherlands Antilles", flag: "🇳🇱" },
  670: { name: "East Timor", flag: "🇹🇱" },
  673: { name: "Brunei", flag: "🇧🇳" },
  855: { name: "Cambodia", flag: "🇰🇭" },
  856: { name: "Laos", flag: "🇱🇦" },
  880: { name: "Bangladesh", flag: "🇧🇩" },
  960: { name: "Maldives", flag: "🇲🇻" },
  961: { name: "Lebanon", flag: "🇱🇧" },
  962: { name: "Jordan", flag: "🇯🇴" },
  963: { name: "Syria", flag: "🇸🇾" },
  964: { name: "Iraq", flag: "🇮🇶" },
  966: { name: "Saudi Arabia", flag: "🇸🇦" },
  967: { name: "Yemen", flag: "🇾🇪" },
  970: { name: "Palestine", flag: "🇵🇸" },
  971: { name: "UAE", flag: "🇦🇪" },
  972: { name: "Israel", flag: "🇮🇱" },
  974: { name: "Qatar", flag: "🇶🇦" },
  975: { name: "Bhutan", flag: "🇧🇹" },
  976: { name: "Mongolia", flag: "🇲🇳" },
  977: { name: "Nepal", flag: "🇳🇵" },
  992: { name: "Tajikistan", flag: "🇹🇯" },
  993: { name: "Turkmenistan", flag: "🇹🇲" },
  996: { name: "Kyrgyzstan", flag: "🇰🇬" },
  998: { name: "Uzbekistan", flag: "🇺🇿" },
};

export const phoneUtils = {
  /**
   * Validate mobile number for a given country code
   */
  validateMobileNumber: function (countryCode: string | number, mobileNumber: string): boolean {
    if (!countryCode || !mobileNumber) return false;
    const code = typeof countryCode === 'string' ? parseInt(countryCode, 10) : countryCode;
    const limits = countryMobileLimits[code as keyof typeof countryMobileLimits];
    if (!limits) return false;

    const numberLength = mobileNumber.replace(/\D/g, "").length;
    return numberLength >= limits.min && numberLength <= limits.max;
  },

  /**
   * Get mobile number limits for a country code
   */
  getLimits: function (countryCode: string | number) {
    const code = typeof countryCode === 'string' ? parseInt(countryCode, 10) : countryCode;
    return countryMobileLimits[code as keyof typeof countryMobileLimits] || null;
  },

  /**
   * Format mobile number with country code
   */
  formatWithCountryCode: function (countryCode: string | number, mobileNumber: string): string {
    const cleanNumber = mobileNumber.replace(/\D/g, "");
    return `+${countryCode}${cleanNumber}`;
  },

  /**
   * Get all supported country codes
   */
  getSupportedCountryCodes: function (): string[] {
    return Object.keys(countryMobileLimits);
  },

  /**
   * Check if country code is supported
   */
  isCountryCodeSupported: function (countryCode: string | number): boolean {
    const code = typeof countryCode === 'string' ? parseInt(countryCode, 10) : countryCode;
    return code in countryMobileLimits;
  },

  /**
   * Parse phone number string into country code and phone number
   */
  parsePhoneNumber: (phoneString: string): { countryCode: string | null; phoneNumber: string | null } => {
    if (!phoneString) return { countryCode: null, phoneNumber: null };

    // Remove + prefix if present
    let phoneWithoutPlus = phoneString.trim();
    while (phoneWithoutPlus.startsWith("+")) {
      phoneWithoutPlus = phoneWithoutPlus.substring(1).trim();
    }

    const clean = phoneWithoutPlus.replace(/\D/g, ""); // remove non-digits
    if (!clean) return { countryCode: null, phoneNumber: null };

    // Get all country codes sorted by length (longest first) to avoid partial matches
    const sortedCodes = Object.keys(countryMobileLimits)
      .map((code) => code.toString())
      .sort((a, b) => {
        // First sort by length (longest first)
        if (b.length !== a.length) {
          return b.length - a.length;
        }
        // If same length, sort numerically
        return parseInt(a) - parseInt(b);
      });

    // Try each country code and validate against limits
    for (const code of sortedCodes) {
      if (clean.startsWith(code)) {
        const phoneWithoutCode = clean.slice(code.length);
        const codeNum = parseInt(code, 10);
        const limits = countryMobileLimits[codeNum as keyof typeof countryMobileLimits];
        
        if (limits) {
          const numberLength = phoneWithoutCode.length;
          // Validate against country limits (with slight tolerance)
          if (numberLength >= limits.min - 1 && numberLength <= limits.max + 1 && numberLength > 0) {
            return {
              countryCode: code,
              phoneNumber: phoneWithoutCode,
            };
          }
        }
      }
    }

    // If no match found with validation, return first match (fallback)
    for (const code of sortedCodes) {
      if (clean.startsWith(code)) {
        return {
          countryCode: code,
          phoneNumber: clean.slice(code.length),
        };
      }
    }

    return {
      countryCode: null,
      phoneNumber: clean,
    };
  },
};

/**
 * Get sorted country options for select dropdown
 */
export const getCountryOptions = () => {
  return Object.keys(countryMobileLimits)
    .map((code) => {
      const codeNum = parseInt(code, 10);
      const info = countryInfo[codeNum] || { name: `+${code}`, flag: "" };
      return {
        value: code.toString(),
        label: `${info.flag} +${code} ${info.name}`,
        code: code.toString(),
        name: info.name,
        flag: info.flag,
      };
    })
    .sort((a, b) => {
      // Sort by country code numerically
      return parseInt(a.code) - parseInt(b.code);
    });
};

export { countryMobileLimits, countryInfo };

