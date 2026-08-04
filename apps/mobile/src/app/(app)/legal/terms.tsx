import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ScreenHeader from '@/components/ScreenHeader';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import type { ThemePalette } from '@/theme/colors';

type Section = {
  id: string;
  heading: string;
  body: Array<{ type: 'p'; text: string } | { type: 'ul'; items: string[] }>;
};

const TOC = [
  'Purpose Of Bloom',
  'Eligibility',
  'Your Account',
  'Acceptable Use',
  'Community Content',
  'Open Source',
  'Local Communities',
  'Privacy',
  'Availability',
  'VPNs and Location Spoofing',
  'Termination',
  'Changes to These Terms',
  'Contact',
];

const SECTIONS: Section[] = [
  {
    id: 'purpose',
    heading: '1. Purpose',
    body: [
      {
        type: 'p',
        text: 'Bloom is a community-focused social platform designed to help people connect with local communities, share information, organize events, and help each other.',
      },
      { type: 'p', text: 'Bloom is currently in Alpha, which means features may change, break, or be removed.' },
    ],
  },
  {
    id: 'eligibility',
    heading: '2. Eligibility',
    body: [
      { type: 'p', text: 'You are responsible for ensuring that your use of Bloom complies with the laws of your country.' },
      {
        type: 'p',
        text: 'If you are under the minimum age required by your local laws to use online services, you must have permission from a parent or legal guardian.',
      },
    ],
  },
  {
    id: 'account',
    heading: '3. Your Account',
    body: [
      { type: 'p', text: 'You are responsible for:' },
      {
        type: 'ul',
        items: ['Keeping Your Password Secure.', 'Providing accurate information when required.', 'Any activity using your account.'],
      },
      { type: 'p', text: 'You may not create accounts to impersonate another person or organization' },
    ],
  },
  {
    id: 'acceptableUse',
    heading: '4. Acceptable Use',
    body: [
      { type: 'p', text: 'You agree not to:' },
      {
        type: 'ul',
        items: [
          'Harass, threaten, or bully others.',
          'Post illegal or fraudulent content.',
          "Share another person's private information without their permission.",
          'Upload malware or attempt to disrupt Bloom.',
          'Spam communities or users.',
          'Circumvent security features or abuse bugs.',
          'Use automated systems to overload the service.',
        ],
      },
      { type: 'p', text: 'Bloom may suspend or remove accounts that violate these rules.' },
    ],
  },
  {
    id: 'comContent',
    heading: '5. Community Content',
    body: [
      { type: 'p', text: 'You retain ownership of the content you create.' },
      {
        type: 'p',
        text: 'By posting content on Bloom, you grant Bloom a non-exclusive license to display, store, and distribute your content as necessary to operate the service.',
      },
      { type: 'p', text: 'You are responsible for anything you post.' },
    ],
  },
  {
    id: 'opSource',
    heading: '6. Open Source',
    body: [
      { type: 'p', text: "Bloom's client and other project components may be released under open-source licenses." },
      { type: 'p', text: 'The open-source nature of Bloom does not give you permission to:' },
      {
        type: 'ul',
        items: ['Access data that is not yours.', "Attack or abuse Bloom's infrastructure.", 'Pretend to represent the official Bloom project.'],
      },
    ],
  },
  {
    id: 'localCom',
    heading: '7. Local Communities',
    body: [
      { type: 'p', text: 'Some communities on Bloom are based on physical locations.' },
      {
        type: 'p',
        text: 'Location information is used to support location-based features such as discovering or joining nearby communities.',
      },
      { type: 'p', text: 'Bloom does not guarantee the accuracy of user-provided locations or community information.' },
    ],
  },
  {
    id: 'privacy',
    heading: '8. Privacy',
    body: [
      { type: 'p', text: 'Your use of Bloom is also governed by the Privacy Policy.' },
      { type: 'p', text: 'Bloom aims to collect only the information necessary to operate the platform.' },
    ],
  },
  {
    id: 'availability',
    heading: '9. Availability',
    body: [
      { type: 'p', text: 'Bloom is provided "as is."' },
      { type: 'p', text: 'Because Bloom is currently under active development:' },
      {
        type: 'ul',
        items: ['Features may change.', 'Downtime may occur.', 'Data may occasionally be lost due to bugs or maintenance.'],
      },
      { type: 'p', text: 'While reasonable efforts are made to keep the service available, uninterrupted operation is not guaranteed.' },
    ],
  },
  {
    id: 'vpns',
    heading: '10. VPNs and Location Spoofing',
    body: [
      {
        type: 'p',
        text: 'Using a VPN or other means to spoof your location may violate these Terms and result in account suspension or termination.',
      },
    ],
  },
  {
    id: 'termination',
    heading: '11. Termination',
    body: [
      {
        type: 'p',
        text: 'Bloom may suspend or terminate accounts that violate these Terms or pose a risk to the platform or its users.',
      },
      { type: 'p', text: 'Users may request deletion of their account, subject to applicable legal requirements and technical limitations.' },
    ],
  },
  {
    id: 'changes',
    heading: '12. Changes to These Terms',
    body: [
      { type: 'p', text: 'These Terms may be updated from time to time.' },
      { type: 'p', text: 'Continued use of Bloom after updated Terms become effective constitutes acceptance of the revised Terms.' },
    ],
  },
  {
    id: 'contact',
    heading: '13. Contact',
    body: [
      { type: 'p', text: 'Questions regarding these Terms may be directed through the official Bloom GitHub repository or other official contact channels.' },
      { type: 'p', text: 'Thank you for helping build a stronger local community through Bloom.' },
    ],
  },
];

export default function TermsOfServiceScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScreenHeader title={t('headerTermsOfService')} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleBlock}>
          <Text style={styles.pageTitle}>The Bloom Project™ Terms Of Service</Text>
          <Text style={styles.pageSubtitle}>Last Updated: July 30, 2026</Text>
        </View>

        <View style={styles.tocCard}>
          <Text style={styles.tocHeading}>Table of Contents</Text>
          <View style={styles.tocList}>
            {TOC.map((item, index) => (
              <Text key={item} style={styles.tocItem}>
                {index + 1}. {item}
              </Text>
            ))}
          </View>
        </View>

        {SECTIONS.map((section) => (
          <View key={section.id} style={styles.sectionCard}>
            <Text style={styles.sectionHeading}>{section.heading}</Text>
            {section.body.map((block, blockIndex) =>
              block.type === 'p' ? (
                <Text key={blockIndex} style={styles.paragraph}>
                  {block.text}
                </Text>
              ) : (
                <View key={blockIndex} style={styles.list}>
                  {block.items.map((item) => (
                    <View key={item} style={styles.listRow}>
                      <Text style={styles.bullet}>{'•'}</Text>
                      <Text style={styles.listText}>{item}</Text>
                    </View>
                  ))}
                </View>
              ),
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemePalette) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, padding: 15, gap: 12 },
  titleBlock: { gap: 4, marginBottom: 4 },
  pageTitle: { color: colors.textPrimary, fontSize: 22, fontWeight: '800' },
  pageSubtitle: { color: colors.textFaint, fontSize: 13 },
  tocCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    gap: 10,
  },
  tocHeading: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  tocList: { gap: 6 },
  tocItem: { color: colors.textSecondary, fontSize: 13, lineHeight: 19 },
  sectionCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    gap: 8,
  },
  sectionHeading: { color: colors.textPrimary, fontSize: 17, fontWeight: '700' },
  paragraph: { color: colors.textSecondary, fontSize: 14, lineHeight: 21 },
  list: { gap: 6, marginTop: 2 },
  listRow: { flexDirection: 'row', gap: 8 },
  bullet: { color: colors.textFaint, fontSize: 14, lineHeight: 21 },
  listText: { flex: 1, color: colors.textSecondary, fontSize: 14, lineHeight: 21 },
});
