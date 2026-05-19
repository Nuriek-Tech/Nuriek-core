/** Query params for /admin/offer-letter after intern → employee conversion. */
export function buildOfferLetterPrefillQuery(input: {
    internUserId: string;
    candidateName: string;
    candidateEmail?: string | null;
    position?: string | null;
    department?: string | null;
    employmentType?: string;
}): string {
    const params = new URLSearchParams();
    params.set("fromIntern", input.internUserId);
    params.set("candidateName", input.candidateName);
    if (input.candidateEmail) params.set("candidateEmail", input.candidateEmail);
    if (input.position) params.set("position", input.position);
    if (input.department) params.set("department", input.department);
    if (input.employmentType) params.set("employmentType", input.employmentType);
    return params.toString();
}

export function offerLetterPrefillPath(input: Parameters<typeof buildOfferLetterPrefillQuery>[0]): string {
    return `/admin/offer-letter?${buildOfferLetterPrefillQuery(input)}`;
}
