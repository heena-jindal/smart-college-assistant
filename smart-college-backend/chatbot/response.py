import random

# Multiple response variants per intent for natural variety
_responses: dict[str, list[str]] = {
    "admission": [
        "Admissions are open! You can apply online through the college portal. Requirements include your 10th and 12th mark sheets, transfer certificate, migration certificate, passport photos, and ID proof. The process typically starts in May–June each year.",
        "To apply for admission, visit the official college website and fill out the online application form. Minimum eligibility is 50% in your previous qualification. Entrance exam scores may also be required for certain programs.",
        "The admissions office is open Monday–Friday, 9 AM to 5 PM. You can also reach them via the college portal. Documents needed: mark sheets, TC, migration certificate, photos, and ID proof.",
    ],
    "fees": [
        "Fees vary by course and can be paid online through the student portal or at the accounts office in person. Installment options are available — contact the accounts section for details.",
        "The fee structure depends on your enrolled program. You can view and pay fees via the student portal before the deadline. For fee receipts or payment issues, contact the accounts office directly.",
        "Online fee payment is available on the student portal. If your payment failed but was deducted, raise a complaint with a screenshot at the accounts office. Demand Drafts are also accepted.",
    ],
    "exams": [
        "Semester exams are conducted at the end of each semester — usually in December and May. The exam timetable is published one month in advance on the examination portal. Your admit card/hall ticket is downloadable from there too.",
        "If you fail a subject, you can appear in the supplementary (back) exam held shortly after results. Check the examination portal for dates and re-registration procedures.",
        "Exam schedules, admit cards, and results are all available on the examination portal. Midterms are typically in weeks 7–8, and finals are in the last two weeks of the semester.",
    ],
    "attendance": [
        "A minimum of 75% attendance is required in each subject to be eligible for semester exams. If you fall below this, you may be detained from appearing in the exam.",
        "Your attendance is tracked subject-wise. You can check it on the student portal. Students below 75% attendance must apply for condonation with valid medical or other documented reasons.",
        "Attendance below 75% can lead to exam detention. Make sure to monitor your attendance regularly on the student portal and inform your class teacher if you have medical leave.",
    ],
    "timetable": [
        "The class timetable is available in the academic section of the college website and student portal. It's updated at the start of each semester.",
        "You can download your timetable from the academic section of the student portal. If there are clashes or issues, contact your department coordinator.",
        "Timetables are published before the semester begins. Check the portal's academic section — you can filter by your batch and section.",
    ],
    "placements": [
        "Our dedicated placement cell organizes campus recruitment drives throughout the year. Top companies from IT, finance, and management sectors visit regularly. Training sessions for aptitude, GD, and interviews are conducted from the 3rd year onward.",
        "The placement cell manages all recruitment activities. Students must register on the placement portal to receive company notifications. Average and highest packages are updated annually on the college website.",
        "Placement drives include both on-campus and off-campus opportunities. The cell also assists with internships and live projects. Contact the placement office for the upcoming recruitment calendar.",
    ],
    "hostel": [
        "Separate hostel facilities are available for boys and girls on campus. Rooms are allotted on a first-come, first-served basis. Hostel fees, mess charges, and rules are available on the hostel office notice board.",
        "The college has hostel accommodations with 24/7 security, Wi-Fi, and mess facilities. Apply for hostel allocation through the student portal during admission. Warden contact details are available on the college website.",
        "Hostel rooms are available in single and shared configurations. Mess food is included in the hostel fee. Day scholars can also opt for mess subscription separately.",
    ],
    "library": [
        "The library is open Monday–Friday from 9 AM to 5 PM and on Saturdays from 9 AM to 1 PM. Students can borrow up to 3 books at a time for 14 days. E-resources and journals are accessible via the student portal.",
        "The college library has a large collection of textbooks, reference books, and research journals. You can access digital resources and e-books from the library portal using your student credentials.",
        "Library services include book lending, reading room access, and online journal subscriptions. Overdue books attract a fine per day. Use the library portal to check availability and reserve books.",
    ],
    "scholarships": [
        "Various scholarships are available including merit-based, need-based, and government schemes (SC/ST/OBC/minority). Application forms and deadlines are posted on the scholarship portal and college notice board.",
        "You can apply for scholarships through the online scholarship portal. Required documents typically include income certificate, caste certificate, mark sheets, and bank details. Apply before the deadline — usually in August–September.",
        "The college offers institutional scholarships for toppers and also facilitates state and central government scholarship schemes. Visit the scholarship cell in the admin block or check the portal for active listings.",
    ],
    "certificates": [
        "You can apply for bonafide certificates, character certificates, and other documents through the administration office or student portal. Processing takes 2–3 working days.",
        "Certificate requests (bonafide, TC, migration) are handled by the admin office. Submit the application form along with the required fee. Certificates are typically ready within 3 working days.",
        "For degree certificates, provisional certificates, or transcripts, apply through the examination section. For bonafide or character certificates, visit the admin office with your student ID.",
    ],
}

_fallback_responses = [
    "I'm not sure about that. Could you rephrase? You can ask me about admissions, fees, exams, attendance, timetable, placements, hostel, library, scholarships, or certificates.",
    "I didn't quite catch that. Try asking about a specific topic like fees, exams, hostel, or placements.",
    "Hmm, I'm not confident about that query. Please rephrase, or choose a topic: admissions, exams, attendance, timetable, placements, hostel, library, scholarships, or certificates.",
]


def get_response(intent: str) -> str:
    """Return a random response variant for the given intent."""
    variants = _responses.get(intent)
    if variants:
        return random.choice(variants)
    return random.choice(_fallback_responses)


# Keep backward compatibility
responses = {intent: variants[0] for intent, variants in _responses.items()}
