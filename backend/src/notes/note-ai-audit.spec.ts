import { resolveNoteAiAudit } from './note-ai-audit';

describe('resolveNoteAiAudit', () => {
  it('returns null audit fields when no suggestion was recorded', () => {
    expect(resolveNoteAiAudit('NETWORK_EFFECTS', 'B2B_SOFTWARE')).toEqual({
      aiSuggestedMoatPattern: null,
      aiSuggestedBusinessModel: null,
      tagEditedByUser: null,
    });
  });

  it('marks tagEditedByUser false when saved tags match the suggestion', () => {
    expect(
      resolveNoteAiAudit('NETWORK_EFFECTS', 'B2B_SOFTWARE', {
        suggestedMoatPattern: 'NETWORK_EFFECTS',
        suggestedBusinessModel: 'B2B_SOFTWARE',
      }),
    ).toEqual({
      aiSuggestedMoatPattern: 'NETWORK_EFFECTS',
      aiSuggestedBusinessModel: 'B2B_SOFTWARE',
      tagEditedByUser: false,
    });
  });

  it('marks tagEditedByUser true when the user overrides a suggested tag', () => {
    expect(
      resolveNoteAiAudit('BRAND', null, {
        suggestedMoatPattern: 'NETWORK_EFFECTS',
        suggestedBusinessModel: 'B2B_SOFTWARE',
      }),
    ).toEqual({
      aiSuggestedMoatPattern: 'NETWORK_EFFECTS',
      aiSuggestedBusinessModel: 'B2B_SOFTWARE',
      tagEditedByUser: true,
    });
  });

  it('treats clearing a suggested tag as an edit', () => {
    expect(
      resolveNoteAiAudit(null, null, {
        suggestedMoatPattern: 'BRAND',
        suggestedBusinessModel: null,
      }),
    ).toEqual({
      aiSuggestedMoatPattern: 'BRAND',
      aiSuggestedBusinessModel: null,
      tagEditedByUser: true,
    });
  });
});
