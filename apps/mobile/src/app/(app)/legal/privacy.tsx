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
  'Information We Collect',
  'Community Information',
  'Location Information',
  'How We Use Your Information',
  'Information We Share',
  'Cookies & Local Storage',
  'Data Security',
  'Account Deletion',
  "Children's Privacy",
  'Changes to This Policy',
  'Contact',
];

const SECTIONS: Section[] = [
  {
    id: 'information',
    heading: '1. Information We Collect',
    body: [
      { type: 'p', text: 'When you create an account, Bloom may collect:' },
      {
        type: 'ul',
        items: [
          'Email address',
          'Username',
          'Password (securely managed through our authentication provider)',
          'Birthday',
          'Profile information you choose to provide, such as your bio or profile picture',
        ],
      },
    ],
  },
  {
    id: 'community',
    heading: '2. Community Information',
    body: [
      { type: 'p', text: 'Bloom stores information necessary to operate communities, including:' },
      {
        type: 'ul',
        items: [
          'Communities you create',
          'Communities you join',
          'Posts and comments you publish',
          'Events and other content you choose to share',
        ],
      },
    ],
  },
  {
    id: 'location',
    heading: '3. Location Information',
    body: [
      {
        type: 'p',
        text: 'Bloom uses location information to support location-based features such as discovering or joining nearby communities.',
      },
      { type: 'p', text: 'Live location is only stored if you explicitly give permission.' },
    ],
  },
  {
    id: 'usage',
    heading: '4. How We Use Your Information',
    body: [
      { type: 'p', text: 'Your information is used to:' },
      {
        type: 'ul',
        items: [
          'Create and manage your account',
          'Display your profile',
          'Show content from communities you join',
          'Operate location-based features',
          'Improve Bloom and its features',
          'Protect the platform against abuse and spam',
        ],
      },
    ],
  },
  {
    id: 'sharing',
    heading: '5. Information We Share',
    body: [
      { type: 'p', text: 'Bloom does not sell your personal information.' },
      {
        type: 'p',
        text: 'Some profile information, posts, comments, and community activity may be visible to other users depending on your privacy settings and the communities you participate in.',
      },
      { type: 'p', text: 'Bloom sends user-submitted text and images to Sightengine for content moderation.' },
      { type: 'p', text: 'Bloom may disclose information if required by applicable law.' },
    ],
  },
  {
    id: 'cookies',
    heading: '6. Cookies & Local Storage',
    body: [
      { type: 'p', text: 'Bloom may use cookies or browser storage to:' },
      {
        type: 'ul',
        items: ['Keep you signed in', 'Remember your preferences', 'Improve your experience'],
      },
      { type: 'p', text: 'These technologies are not used to sell your personal information.' },
    ],
  },
  {
    id: 'security',
    heading: '7. Data Security',
    body: [
      {
        type: 'p',
        text: 'Bloom takes reasonable measures to protect your information from unauthorized access, loss, or misuse.',
      },
      { type: 'p', text: 'However, no online service can guarantee absolute security.' },
    ],
  },
  {
    id: 'deletion',
    heading: '8. Account Deletion',
    body: [
      { type: 'p', text: 'You may request deletion of your account.' },
      {
        type: 'p',
        text: 'When an account is deleted, Bloom will remove or anonymize personal information where reasonably possible, subject to legal obligations and technical limitations.',
      },
      { type: 'p', text: 'Some public content may remain if necessary to preserve community discussions.' },
    ],
  },
  {
    id: 'children',
    heading: "9. Children's Privacy",
    body: [
      {
        type: 'p',
        text: 'Bloom is not intended for individuals below the minimum age required by applicable law to use online services without appropriate permission.',
      },
      { type: 'p', text: 'The minimum age is 13 in the platform, but this may vary by jurisdiction.' },
    ],
  },
  {
    id: 'changes',
    heading: '10. Changes to This Policy',
    body: [
      { type: 'p', text: 'This Privacy Policy may be updated from time to time.' },
      { type: 'p', text: 'The "Last Updated" date at the top of this page reflects the latest version.' },
      {
        type: 'p',
        text: 'Your continued use of Bloom after changes take effect constitutes acceptance of the updated Privacy Policy.',
      },
    ],
  },
  {
    id: 'contact',
    heading: '11. Contact',
    body: [
      {
        type: 'p',
        text: 'If you have questions about this Privacy Policy, please contact the Bloom project through its official GitHub repository or other official contact channels.',
      },
      { type: 'p', text: 'Thank you for helping us build a safe and community-focused platform.' },
    ],
  },
];

export default function PrivacyPolicyScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScreenHeader title={t('headerPrivacyPolicy')} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleBlock}>
          <Text style={styles.pageTitle}>The Bloom Project™ Privacy Policy</Text>
          <Text style={styles.pageSubtitle}>Last Updated July 29, 2026</Text>
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
