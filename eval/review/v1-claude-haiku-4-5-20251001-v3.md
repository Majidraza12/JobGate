# Extraction review: v1-claude-haiku-4-5-20251001-v3

For each row decide: label wrong (fix eval/labels-v1.json, then npm run label:import) or model wrong (leave it).

65 disagreements: value 34, spurious 22, status 8, missed 1.
Failed extractions: jd-003 (schema_invalid), jd-012 (schema_invalid), jd-027 (schema_invalid), jd-054 (schema_invalid).

## jd-001 (random) Notion: Software Engineer – Early Career - AI

### start_options: value
- gold: stated, required, ["\"immediate full time\""]
> can start full time right away
- model: stated, required, ["\"full-time, immediate\""]
> can start full time right away

## jd-002 (random) Merck: 2027 Future Talent Program - AI/ML Biomedical Imaging and Computational Pathology - Intern

### grad_requirements: spurious
- gold: not mentioned
> (no quote)
- model: stated, required, ["[[\"phd\"],null,\"2027-05\",\"2027-06\"]"]
> Must be available to work full-time for 9-12 weeks beginning in May or June of 2027.

## jd-005 (random) HP IQ: Software Engineering Intern, AML Platform (Summer 2027)

### degree_levels: spurious
- gold: not mentioned
> (no quote)
- model: stated, required, ["\"bs\"","\"ms\"","\"phd\""]
> Currently pursuing a degree in Computer Science, Engineering, or related field, or equivalent practical experience.

### start_options: value
- gold: stated, required, ["\"2027-05\"","\"2027-06\""]
> 2027 Internship Program Dates: May/June–August/September 2027
- model: stated, required, ["\"2027 internship program (may/june–august/september)\""]
> 2027 Internship Program Dates: May/June–August/September 2027. Final dates will be based on student schedules.

## jd-007 (random) IMC Trading: Graduate Machine Learning Researcher

### grad_requirements: value
- gold: stated, required, ["[null,\"august 2027\",null,\"2027-08\"]","[null,\"february 2027\",null,\"2027-02\"]"]
> completed to start full time in February or August 2027
- model: stated, required, ["[[\"bs\",\"ms\",\"phd\"],null,\"2027-02\",\"2027-08\"]"]
> PhD, Master's or Bachelor's degree (completed to start full time in February or August 2027, or currently in a postdoctoral position)

## jd-009 (random) TransMarket Group: Junior Quantitative Trader

### grad_requirements: value
- gold: stated, required, ["[null,null,\"2026-12\",\"2027-05\"]"]
> graduation date between December 2026 and Spring 2027
- model: stated, required, ["[[\"bs\",\"ms\",\"phd\"],null,\"2026-12\",\"2027-05\"]"]
> Bachelor's, Master's, or Doctorate degree in a technical or industry related field such as, but not limited to, mathematics, statistics or mathematical finance with a graduation date between December 2026 and Spring 2027

## jd-011 (random) Fidelity Investments: Leap Software Engineer

### grad_requirements: value
- gold: stated, required, ["[null,null,null,\"2027-07\"]"]
> must have earned or be on track to earn a bachelor’s degree in computer science, Software Engineering, or a related field by the start date
- model: stated, required, ["[[\"bs\"],null,null,\"2027-07\"]"]
> applicants must have earned or be on track to earn a bachelor's degree in computer science, Software Engineering, or a related field by the start date

## jd-013 (random) The Hartford: Tech & Data Program Summer 2027 – Data Engineer Intern (Hartford)

### grad_requirements: value
- gold: stated, required, ["[null,null,\"2028-05\",\"2028-05\"]"]
> expecting to graduate in May 2028
- model: stated, required, ["[[\"bs\",\"ms\"],\"summer 2027\",\"2028-05\",\"2028-05\"]"]
> Undergraduate or graduate student expecting to graduate in May 2028 with a Bachelor's or Master's degree

### start_options: value
- gold: stated, required, ["\"summer 2027\""]
> Tech & Data Program Summer 2027 – Data Engineer Intern
- model: stated, required, ["\"2027-06\""]
> Tech & Data Program Summer 2027

### citizenship_required: spurious
- gold: not mentioned
> (no quote)
- model: stated, required, false
> Candidate must be authorized to work in the US without company sponsorship

## jd-015 (random) NOV: Software Engineer - Pathway - Rig Technologies

### grad_requirements: status
- gold: ambiguous, required, null
> graduating May 2027 and December 2026 or a recent graduate (0-2 years)
- model: stated, required, ["[null,null,\"2026-12\",\"2027-05\"]"]
> graduating May 2027 and December 2026 or a recent graduate (0-2 years)

### degree_levels: spurious
- gold: not mentioned
> (no quote)
- model: stated, required, ["\"bs\""]
> graduating May 2027 and December 2026 or a recent graduate (0-2 years) from one of the following programs

### start_options: value
- gold: stated, required, ["\"2027-06\"","\"other dates available\""]
> The start date for this program will be June 2027, but other start dates are available.
- model: stated, required, ["\"2027-06\""]
> The start date for this program will be June 2027, but other start dates are available

## jd-016 (random) Texas Instruments: Software Intern - Summer 2027

### start_options: value
- gold: stated, required, ["\"end of may\""]
> Program Duration: End of May - Early August
- model: stated, required, ["\"2027-06\""]
> Software Intern - Summer 2027
> Program Duration: End of May - Early August

## jd-018 (random) McKesson: Software Engineer Intern - Summer 2027

### start_options: spurious
- gold: not mentioned
> (no quote)
- model: stated, required, ["\"summer\""]
> Full time / 10 weeks

## jd-019 (random) Cambridge Investment Research: IT Operations Intern - Service Desk, Infrastructure, Prod Support

### class_years: spurious
- gold: not mentioned
> (no quote)
- model: stated, required, ["\"freshman\"","\"junior\"","\"senior\"","\"sophomore\""]
> Current undergraduate student pursuing Information Technology, Computer Information Systems, Computer Science, Network or Systems Administration, Cybersecurity, Data Analytics, Software Engineering, or a related technology program.

### start_options: value
- gold: stated, required, ["\"may 17 (year not stated)\""]
> May 17 – July 30
- model: stated, required, ["\"2025-05\""]
> 11-week paid summer internship program (May 17 – July 30)

### citizenship_required: spurious
- gold: not mentioned
> (no quote)
- model: stated, required, false
> Applicants must be authorized to work for any employer in the United States

## jd-021 (random) American Express: AI Engineer 1 - Enterprise Technology Services

### grad_requirements: value
- gold: stated, required, ["[null,null,null,\"2027-05\"]"]
> or another technical field before June 2027
- model: stated, required, ["[[\"ms\"],null,null,\"2027-06\"]"]
> Must have earned a Master's degree in Computer Science, Machine Learning, Data Science, Artificial Intelligence, Computer Engineering, Software Engineering, or another technical field before June 2027.

### citizenship_required: spurious
- gold: not mentioned
> (no quote)
- model: stated, required, false
> Employment eligibility to work with American Express in the United States is required as the company will not pursue visa sponsorship for these positions.

## jd-024 (random) The Boeing Company: ASIC/FPGA Verification Engineer Lead - Associate

### degree_levels: value
- gold: stated, required, ["\"bs\""]
> A Bachelor of Science degree in Engineering
- model: stated, required, ["\"bs\"","\"ms\""]
> A Bachelor of Science degree in Engineering (specializing in Electrical, Mechanical, or Aeronautical), Computer Science, Data Science, Mathematics, Physics, Chemistry, or equivalent non-US qualifications relevant to the job description
> Master's Degree in EE, Computer Engineering/Science, or related field, or equivalent experience

### clearance: value
- gold: stated, required, ability_to_obtain/secret
> An interim and/or final U.S. Secret Clearance Post-Start is required.
- model: stated, required, active/secret
> An interim and/or final U.S. Secret Clearance Post-Start is required.

## jd-028 (random) Perplexity AI: Member of Technical Staff - AI Policy and Strategic Initiatives

### grad_requirements: spurious
- gold: not mentioned
> (no quote)
- model: stated, required, ["[null,null,\"2028-01\",null]"]
> we ask for a minimum 2-year commitment (i.e., you would apply for the entering class of 2028 or later)

## jd-029 (random) Veeva Systems: Marketing Analytics - Data Analyst - Analytics Development Program

### grad_requirements: status
- gold: ambiguous, required, null
> This role is designed for upcoming or recent graduates
- model: stated, required, ["[null,\"july 2027\",\"2027-07\",null]"]
> The anticipated start date is July 2027.

## jd-030 (random) ICF: 2027 Summer Intern, Software Engineer (Reston, VA)

### start_options: value
- gold: stated, required, ["\"june 2027\""]
> expected to begin in June and end in August
- model: stated, required, ["\"2025-06\""]
> This is an entry-level, 10-week, full-time internship expected to begin in June and end in August.

## jd-031 (keyword) Booz Allen: Software Developer

### grad_requirements: value
- gold: stated, required, ["[null,null,null,\"2028-08\"]"]
> Scheduled to obtain a Master's degree in a Technology, Engineering, or Mathematics field by Summer 2028
- model: stated, required, ["[[\"ms\"],null,null,\"2028-06\"]"]
> Scheduled to obtain a Master's degree in a Technology, Engineering, or Mathematics field by Summer 2028

## jd-032 (keyword) Cowboy Space: Intern, Software Engineering, 2027

### degree_levels: value
- gold: stated, required, ["\"bs\"","\"ms\"","\"phd\""]
> Currently enrolled as an undergraduate or graduate student
- model: stated, required, ["\"bs\"","\"ms\""]
> Currently enrolled as an undergraduate or graduate student in Computer Science, Computer Engineering, Electrical Engineering, or a related STEM field

### citizenship_required: spurious
- gold: not mentioned
> (no quote)
- model: stated, required, true
> applicants must be a U.S. citizen, lawful permanent resident of the U.S., protected individual as defined by 8 U.S.C. 1324b(a)(3), or eligible to obtain the required authorizations from the U.S. Department of State

## jd-033 (keyword) Klaviyo: Machine Learning Engineer Internship-Summer 2027

### grad_requirements: value
- gold: stated, required, ["[null,null,\"2027-12\",\"2028-06\"]"]
> Graduating in December 2027 or May/June 2028
- model: stated, preferred, ["[[\"phd\"],null,\"2027-12\",\"2028-06\"]"]
> Pursuing an advanced degree Phd preferred in Computer Science, Artificial Intelligence, Machine Learning, or a related field, Graduating in December 2027 or May/June 2028

### degree_levels: value
- gold: stated, required, ["\"ms\"","\"phd\""]
> Pursuing an advanced degree Phd preferred
- model: stated, preferred, ["\"phd\""]
> Pursuing an advanced degree Phd preferred in Computer Science, Artificial Intelligence, Machine Learning, or a related field

### start_options: value
- gold: stated, required, ["\"june 1\""]
> 11-week paid experience [June 1–August 13]
- model: stated, required, ["\"2028-06\""]
> Our Summer Machine Learning Internship Program is an 11-week paid experience [June 1–August 13]

## jd-034 (keyword) American Family Insurance Group: Summer 2027 Intern - Data Engineer

### grad_requirements: value
- gold: stated, required, ["[null,null,\"2027-08\",null]"]
> graduating August 2027 or later
- model: stated, required, ["[null,null,\"2027-08\",\"2028-05\"]","[null,null,\"2027-08\",null]"]
> Must be in student status at an accredited 4-year college or university during the internship, graduating August 2027 or later
> Strongly prefer candidates graduating in August 2027, December 2027 or May 2028

### must_return_to_school: spurious
- gold: not mentioned
> (no quote)
- model: stated, required, true
> Must be in student status at an accredited 4-year college or university during the internship

### start_options: value
- gold: stated, required, ["\"mid to late may\""]
> starts in mid to late May and ends in August
- model: stated, required, ["\"2027-05\""]
> a 10 to 14 week program that starts in mid to late May and ends in August

## jd-035 (keyword) 9to9 Software Solutions: Entry Level Java Developer

### grad_requirements: spurious
- gold: not mentioned
> (no quote)
- model: ambiguous, required, null
> A Bachelor's or Associate's degree in Computer Science or related field.
> Bachalors/Masters in computer science

### degree_levels: value
- gold: stated, required, ["\"bs\""]
> A Bachelor's or Associate’s degree in Computer Science or related field.
- model: stated, required, ["\"bs\"","\"ms\""]
> A Bachelor's or Associate's degree in Computer Science or related field.
> Bachalors/Masters in computer science

### clearance: value
- gold: stated, required, ability_to_obtain/secret
> Possess a SECRET clearance or have the ability to obtain one.
- model: stated, required, active/secret
> Possess a SECRET clearance or have the ability to obtain one. Must have at least an interim SECRET to begin work on the contract.

## jd-036 (keyword) Astranis: FPGA Associate

### grad_requirements: status
- gold: ambiguous, required, null
> designed for new grads who have who have graduated from a four-year university
- model: stated, required, ["[null,\"winter 2027\",\"2026-12\",\"2027-03\"]"]
> Associate positions at Astranis typically last for twelve weeks, and are salaried roles designed for new grads who have who have graduated from a four-year university.
> FPGA Associate (Winter 2027)

### start_options: value
- gold: stated, required, ["\"winter 2027\""]
> FPGA Associate (Winter 2027)
- model: stated, required, ["\"2027-01\""]
> FPGA Associate (Winter 2027)

## jd-037 (keyword) SpaceX: Software Engineer - Components Test - Starshield

### clearance: status
- gold: ambiguous, preferred, active/null
> an active clearance may provide the opportunity for you to work on sensitive SpaceX missions
- model: stated, preferred, preferred/null
> an active clearance may provide the opportunity for you to work on sensitive SpaceX missions

## jd-038 (keyword) Oshkosh: AI Intern

### grad_requirements: spurious
- gold: not mentioned
> (no quote)
- model: stated, required, ["[[\"bs\",\"ms\"],\"summer 2027\",\"2027-06\",\"2027-08\"]"]
> Pursuing a Bachelor's or Master's degree in Computer Science, Computer Engineering, Software Engineering, Electrical Engineering, Data Science, or a related technical field
> As an AI Engineer Intern in Summer 2027

### start_options: value
- gold: stated, required, ["\"summer 2027\""]
> As an AI Engineer Intern in Summer 2027
- model: stated, required, ["\"2027-06\""]
> As an AI Engineer Intern in Summer 2027

### us_person_required: status
- gold: ambiguous, required, true
> Applicants for these positions may need to be
- model: stated, required, true
> Certain positions with Oshkosh Corporation require access to controlled goods and technologies subject to the International Traffic in Arms Regulations or the Export Administration Regulations. Applicants for these positions may need to be "U.S. Persons," as defined in these regulations. Generally, a "U.S. Person" is a U.S. citizen, lawful permanent resident, or an individual who has been admitted as a refugee or granted asylum.

## jd-039 (keyword) Intel: Foundry Advanced Device Development Engineer

### grad_requirements: spurious
- gold: not mentioned
> (no quote)
- model: ambiguous, required, null
> Must possess a Master's degree in Electrical Engineering, Physics, Material Science, or scientific field of study directly related to Semiconductor.

## jd-040 (keyword) Pennsylvania State University: Software Engineer - Multiple Teams

### degree_levels: value
- gold: stated, required, ["\"bs\""]
> Bachelor's Degree - Engineering or Science
- model: stated, preferred, ["\"bs\"","\"ms\"","\"phd\""]
> Bachelor's, Master's, or PhD degree in Computer Engineering or Computer Science

### clearance: value
- gold: stated, required, ability_to_obtain/null
> Employees must be eligible to obtain a government security clearance
- model: stated, required, ability_to_obtain/secret
> Employees must be eligible to obtain a government security clearance
> Current eligibility for access to classified information at the Secret level or higher and may be subject to a government background investigation to upgrade clearance eligibility to the TS/SCI level

## jd-041 (keyword) Adobe: Software Engineer New Grad

### grad_requirements: value
- gold: stated, required, ["[null,null,\"2026-12\",\"2027-06\"]"]
> with an expected graduation date of December 2026 – June 2027
- model: stated, required, ["[[\"bs\",\"ms\"],null,\"2026-12\",\"2027-06\"]"]
> Bachelor's or Master's degree in Computer Science, Computer Engineering, or a related technical field, with an expected graduation date of December 2026 – June 2027

## jd-042 (keyword) Stryker: Summer 2027 Internship - Data Science - Remote

### grad_requirements: spurious
- gold: not mentioned
> (no quote)
- model: ambiguous, required, null
> must remain enrolled in a degree-seeking program after the internship

### citizenship_required: spurious
- gold: not mentioned
> (no quote)
- model: stated, required, false
> Must be legally authorized to work in the U.S. and not require sponsorship now or in the future

## jd-044 (keyword) Sim: Founding Design Engineer

### sponsorship_future_unavailable: missed
- gold: stated, required, false
> We sponsor visas.
- model: not mentioned
> (no quote)

## jd-045 (keyword) SpaceX: Software Engineer - Starlink Network

### citizenship_required: spurious
- gold: not mentioned
> (no quote)
- model: stated, required, true
> To conform to U.S. Government export regulations, applicant must be a (i) U.S. citizen or national, (ii) U.S. lawful, permanent resident (aka green card holder), (iii) Refugee under 8 U.S.C. § 1157, or (iv) Asylee under 8 U.S.C. § 1158

## jd-046 (keyword) Nissan: AI Agent Architect Intern - Summer 2027 - Farmington Hills, MI

### start_options: value
- gold: stated, required, ["\"summer 2027\""]
> AI Agent Architect Intern to join our team in Farmington Hills, MI
- model: stated, required, ["\"12-week program\""]
> Full-time, 12-week program

### citizenship_required: spurious
- gold: not mentioned
> (no quote)
- model: stated, required, false
> Candidates for this position must be legally authorized to work in the United States

## jd-047 (keyword) Pennsylvania State University: Simulation Software Engineer

### clearance: value
- gold: stated, required, ability_to_obtain/null
> Employees must be eligible to obtain a government security clearance
- model: stated, required, ability_to_obtain/secret
> Employees must be eligible to obtain a government security clearance
> Current eligibility for access to classified information at the Secret level or higher and may be subject to a government background investigation to upgrade clearance eligibility, if required

## jd-048 (keyword) Booz Allen: University - 2027 Summer Games Software Developer Intern - Annapolis Junction, MD

### grad_requirements: value
- gold: stated, required, ["[null,null,null,\"2029-08\"]"]
> by Summer 2028 or Summer 2029
- model: stated, required, ["[[\"bs\"],null,null,\"2029-06\"]"]
> Scheduled to obtain a Bachelor's degree in a Technology, Engineering, or Mathematics field by Summer 2028 or Summer 2029

### start_options: spurious
- gold: not mentioned
> (no quote)
- model: stated, required, ["\"2027-06\""]
> University - 2027 Summer Games Software Developer Intern

## jd-049 (keyword) The Aerospace Corporation: Research Associate - Space Photovoltaic Hardware/Device Testing

### grad_requirements: status
- gold: ambiguous, required, null
> (pursuing or conferred within last 12 months)
- model: stated, required, ["[[\"bs\"],null,null,\"2024-12\"]"]
> Bachelor's degree from an accredited college/university program in Physics, Materials Science, Chemistry, Electrical Engineering or related discipline (pursuing or conferred within last 12 months)

## jd-050 (keyword) PTC: Associate Enterprise Integration Engineer

### citizenship_required: spurious
- gold: not mentioned
> (no quote)
- model: stated, required, false
> This position is not eligible for employment-based immigration sponsorship.

## jd-053 (keyword) BNY: Data Science Analyst - Engineering

### degree_levels: status
- gold: ambiguous, required, ["\"bs\""]
> Enrollment in a 4-year undergraduate degree program
- model: stated, required, ["\"bs\""]
> Enrollment in a 4-year undergraduate degree program

## jd-055 (keyword) General Matter: Software Engineer New Grad

### clearance: value
- gold: stated, required, ability_to_obtain/null
> capability to obtain and maintain a US Q clearance
- model: stated, required, ability_to_obtain/secret
> Currently a US Citizen with capability to obtain and maintain a US Q clearance.

## jd-057 (keyword) KBR: Junior Software Engineer

### degree_levels: value
- gold: stated, required, ["\"bs\""]
> BA/BS in Computer Science, Software Engineering or related field
- model: stated, required, ["\"bs\"","\"ms\""]
> BA/BS in Computer Science, Software Engineering or related field and 0-3 years of related experience, or AA in related field and 3 years of related experience

## jd-058 (keyword) Anduril: 2027 Finance Data Analyst Intern

### grad_requirements: value
- gold: stated, required, ["[null,null,\"2027-12\",\"2028-06\"]"]
> graduating between [December 2027 and June 2028]
- model: stated, required, ["[[\"bs\",\"ms\"],null,\"2027-12\",\"2028-06\"]"]
> Currently pursuing a Bachelor's or Master's degree in Finance, Accounting, Economics, Data Science, Statistics, Computer Science, Information Systems, or a related field, graduating between [December 2027 and June 2028]

### sponsorship_now_unavailable: spurious
- gold: not mentioned
> (no quote)
- model: stated, required, true
> Must be authorized to work in the United States

## jd-060 (keyword) Spry Methods: Intelligence Analyst 1

### grad_requirements: spurious
- gold: not mentioned
> (no quote)
- model: ambiguous, required, null
> Candidates will have a bachelor's degree or three (3) or more years of hands–on experience performing administrative, analytical, and research functions

### clearance: status
- gold: ambiguous, required, active/top_secret
> Top Secret Clearance is required
- model: stated, required, active/top_secret
> Top Secret Clearance is required
