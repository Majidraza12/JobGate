# Extraction review: v1-claude-haiku-4-5-20251001-v4

For each row decide: label wrong (fix eval/labels-v1.json, then npm run label:import) or model wrong (leave it).

64 disagreements: value 33, status 7, spurious 20, unverified 1, missed 3.

## jd-001 (random) Notion: Software Engineer – Early Career - AI

### start_options: value
- gold: stated, required, ["\"immediate full time\""]
> can start full time right away
- model: stated, required, ["\"full-time immediate\""]
> can start full time right away

## jd-003 (random) Datadog: Software Engineering Intern (Summer)

### grad_requirements: status
- gold: ambiguous, required, null
> Targeting a 2028 full-time start date
- model: stated, required, ["[null,null,\"2028-01\",\"2028-12\"]"]
> Targeting a 2028 full-time start date

### degree_levels: spurious
- gold: not mentioned
> (no quote)
- model: stated, required, ["\"bs\""]
> Pursuing a degree in Computer Science, Software Engineering, or a related technical field, or have equivalent practical experience

### us_person_required: value
- gold: ambiguous, required, true
> some of these roles may require candidates to be eligible for any required authorizations from the US government
- model: ambiguous, required, null
> to conform to US export control regulations, some of these roles may require candidates to be eligible for any required authorizations from the US government

## jd-005 (random) HP IQ: Software Engineering Intern, AML Platform (Summer 2027)

### degree_levels: spurious
- gold: not mentioned
> (no quote)
- model: stated, required, ["\"bs\"","\"ms\""]
> Currently pursuing a degree in Computer Science, Engineering, or related field, or equivalent practical experience.

### start_options: value
- gold: stated, required, ["\"2027-05\"","\"2027-06\""]
> 2027 Internship Program Dates: May/June–August/September 2027
- model: stated, required, ["\"2027-05\""]
> 2027 Internship Program Dates: May/June–August/September 2027. Final dates will be based on student schedules.

## jd-007 (random) IMC Trading: Graduate Machine Learning Researcher

### grad_requirements: value
- gold: stated, required, ["[null,\"august 2027\",null,\"2027-08\"]","[null,\"february 2027\",null,\"2027-02\"]"]
> completed to start full time in February or August 2027
- model: stated, required, ["[null,null,null,\"2027-02\"]","[null,null,null,\"2027-08\"]"]
> PhD, Master's or Bachelor's degree (completed to start full time in February or August 2027, or currently in a postdoctoral position)

## jd-012 (random) Lawrence Livermore National Laboratory (LLNL): Critical Infrastructure Analysis Undergraduate Intern - Cyber and Critical Infrastructure Summer Institute - Summer 2027

### grad_requirements: value
- gold: stated, required, ["[null,null,\"2027-06\",null]"]
> If you are graduating with your bachelor's degree in Spring 2027 and/or starting a graduate degree program in Fall 2027, you will need to apply for Critical Infrastructure Analysis Graduate Intern
- model: stated, required, ["[null,null,null,\"2027-05\"]"]
> Must be a continuing college or university student in good standing at an accredited institution pursuing an undergraduate degree in Engineering or other related fields. If you are graduating with your bachelor's degree in Spring 2027 and/or starting a graduate degree program in Fall 2027, you will need to apply for Critical Infrastructure Analysis Graduate Intern - Cyber and Critical Infrastructure Summer Institute position.

### start_options: value
- gold: stated, required, ["\"2027-05\""]
> a range of start dates between May 17, 2027, and June 21, 2027
- model: stated, required, ["\"2027-05\"","\"2027-06\""]
> The 2027 CSI program will run during the summer with a range of start dates between May 17, 2027, and June 21, 2027, and flexible end dates through September 24, 2027.

### citizenship_required: spurious
- gold: not mentioned
> (no quote)
- model: stated, required, false
> this work must be performed by a U.S. person (U.S. citizen, U.S. lawful permanent resident, U.S. national, or U.S. protected individual (e.g., refugee, asylee)).

## jd-013 (random) The Hartford: Tech & Data Program Summer 2027 – Data Engineer Intern (Hartford)

### grad_requirements: value
- gold: stated, required, ["[null,null,\"2028-05\",\"2028-05\"]"]
> expecting to graduate in May 2028
- model: stated, required, ["[null,\"summer 2027\",null,\"2028-05\"]"]
> Undergraduate or graduate student expecting to graduate in May 2028 with a Bachelor's or Master's degree and a GPA of 3.0 or higher.

### start_options: value
- gold: stated, required, ["\"summer 2027\""]
> Tech & Data Program Summer 2027 – Data Engineer Intern
- model: stated, required, ["\"2027-06\""]
> Tech & Data Program Summer 2027 – Data Engineer Intern

## jd-015 (random) NOV: Software Engineer - Pathway - Rig Technologies

### grad_requirements: status
- gold: ambiguous, required, null
> graduating May 2027 and December 2026 or a recent graduate (0-2 years)
- model: stated, required, ["[null,null,\"2026-12\",\"2027-05\"]"]
> graduating May 2027 and December 2026 or a recent graduate (0-2 years)

### degree_levels: unverified
- gold: not mentioned
> (no quote)
- model: unverified, required, ["\"bs\""]
> graduating May 2027 and December 2026 or a recent graduate (0-2 years) from one of the following programs or equivalent: Computer Engineering, Computer Science, Electrical Engineering, Mechanical Engineering, Mechatronics Engineering

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
> End of May - Early August

## jd-019 (random) Cambridge Investment Research: IT Operations Intern - Service Desk, Infrastructure, Prod Support

### grad_requirements: spurious
- gold: not mentioned
> (no quote)
- model: stated, required, ["[null,\"summer 2025\",\"2025-05\",\"2025-07\"]"]
> Cambridge's Next Step 11-week paid summer internship program (May 17 – July 30)

### class_years: spurious
- gold: not mentioned
> (no quote)
- model: stated, required, ["\"freshman\"","\"junior\"","\"senior\"","\"sophomore\""]
> Current undergraduate student pursuing Information Technology, Computer Information Systems, Computer Science, Network or Systems Administration, Cybersecurity, Data Analytics, Software Engineering, or a related technology program.

### start_options: value
- gold: stated, required, ["\"may 17 (year not stated)\""]
> May 17 – July 30
- model: stated, required, ["\"2025-05\""]
> Cambridge's Next Step 11-week paid summer internship program (May 17 – July 30)

## jd-021 (random) American Express: AI Engineer 1 - Enterprise Technology Services

### grad_requirements: value
- gold: stated, required, ["[null,null,null,\"2027-05\"]"]
> or another technical field before June 2027
- model: stated, required, ["[[\"ms\"],null,null,\"2027-06\"]"]
> Must have earned a Master's degree in Computer Science, Machine Learning, Data Science, Artificial Intelligence, Computer Engineering, Software Engineering, or another technical field before June 2027.

## jd-022 (random) Bot Auto: Algorithm Engineer New Grad - Deep Learning & Vision

### grad_requirements: missed
- gold: ambiguous, required, null
> (including upcoming graduates)
- model: not mentioned
> (no quote)

## jd-024 (random) The Boeing Company: ASIC/FPGA Verification Engineer Lead - Associate

### degree_levels: value
- gold: stated, required, ["\"bs\""]
> A Bachelor of Science degree in Engineering
- model: stated, required, ["\"bs\"","\"ms\""]
> A Bachelor of Science degree in Engineering (specializing in Electrical, Mechanical, or Aeronautical), Computer Science, Data Science, Mathematics, Physics, Chemistry, or equivalent non-US qualifications relevant to the job description
> Master's Degree in EE, Computer Engineering/Science, or related field, or equivalent experience

## jd-027 (random) Johnson & Johnson: Data Science Co-Op, Summer 2027

### grad_requirements: value
- gold: stated, required, ["[null,null,\"2027-05\",null]"]
> must not have a graduation date prior to the start of the co-op term
- model: stated, required, ["[null,\"2027-06\",null,\"2027-05\"]"]
> must not have a graduation date prior to the start of the co-op term
> The Summer 2027 term dates are from 05/10/2027 – 08/13/2027

### must_return_to_school: status
- gold: ambiguous, required, true
> Considered a student during the co-op term
- model: stated, required, true
> Considered a student during the co-op term
> Responsibilities will increase with each rotation as you learn more by returning to school.

### citizenship_required: spurious
- gold: not mentioned
> (no quote)
- model: stated, required, false
> Permanently authorized to work in the U.S., must not require sponsorship of an employment visa (e.g., H-1B or green card) at the time of application or in the future.

## jd-028 (random) Perplexity AI: Member of Technical Staff - AI Policy and Strategic Initiatives

### grad_requirements: spurious
- gold: not mentioned
> (no quote)
- model: stated, required, ["[null,null,null,\"2028-12\"]"]
> we ask for a minimum 2-year commitment (i.e., you would apply for the entering class of 2028 or later)

### must_return_to_school: spurious
- gold: not mentioned
> (no quote)
- model: stated, required, false
> We welcome candidates who plan to attend law school or PhD programs in the future; we ask for a minimum 2-year commitment

## jd-030 (random) ICF: 2027 Summer Intern, Software Engineer (Reston, VA)

### start_options: value
- gold: stated, required, ["\"june 2027\""]
> expected to begin in June and end in August
- model: stated, required, ["\"2024-06\""]
> expected to begin in June and end in August

### sponsorship_now_unavailable: spurious
- gold: not mentioned
> (no quote)
- model: stated, required, true
> Candidate must be a US citizen, reside in the U.S., be authorized to work in the U.S., and all work must be performed in the U.S. per contract requirements

## jd-031 (keyword) Booz Allen: Software Developer

### grad_requirements: value
- gold: stated, required, ["[null,null,null,\"2028-08\"]"]
> Scheduled to obtain a Master's degree in a Technology, Engineering, or Mathematics field by Summer 2028
- model: stated, required, ["[[\"ms\"],null,null,\"2028-08\"]"]
> Scheduled to obtain a Master's degree in a Technology, Engineering, or Mathematics field by Summer 2028

## jd-032 (keyword) Cowboy Space: Intern, Software Engineering, 2027

### degree_levels: value
- gold: stated, required, ["\"bs\"","\"ms\"","\"phd\""]
> Currently enrolled as an undergraduate or graduate student
- model: stated, required, ["\"bs\"","\"ms\""]
> Currently enrolled as an undergraduate or graduate student in Computer Science, Computer Engineering, Electrical Engineering, or a related STEM field

## jd-033 (keyword) Klaviyo: Machine Learning Engineer Internship-Summer 2027

### grad_requirements: value
- gold: stated, required, ["[null,null,\"2027-12\",\"2028-06\"]"]
> Graduating in December 2027 or May/June 2028
- model: stated, required, ["[null,\"summer 2025\",null,\"2028-06\"]"]
> Graduating in December 2027 or May/June 2028

### degree_levels: value
- gold: stated, required, ["\"ms\"","\"phd\""]
> Pursuing an advanced degree Phd preferred
- model: stated, preferred, ["\"phd\""]
> Pursuing an advanced degree Phd preferred in Computer Science, Artificial Intelligence, Machine Learning, or a related field

### start_options: value
- gold: stated, required, ["\"june 1\""]
> 11-week paid experience [June 1–August 13]
- model: stated, required, ["\"2025-06\""]
> Our Summer Machine Learning Internship Program is an 11-week paid experience [June 1–August 13]

## jd-034 (keyword) American Family Insurance Group: Summer 2027 Intern - Data Engineer

### grad_requirements: value
- gold: stated, required, ["[null,null,\"2027-08\",null]"]
> graduating August 2027 or later
- model: stated, required, ["[null,null,\"2027-08\",null]","[null,null,null,\"2028-05\"]"]
> graduating August 2027 or later
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
> Our summer student internship is a 10 to 14 week program that starts in mid to late May and ends in August

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

## jd-036 (keyword) Astranis: FPGA Associate

### grad_requirements: status
- gold: ambiguous, required, null
> designed for new grads who have who have graduated from a four-year university
- model: stated, required, ["[null,\"winter 2027\",\"2027-01\",\"2027-02\"]"]
> Associate positions at Astranis typically last for twelve weeks, and are salaried roles designed for new grads who have who have graduated from a four-year university.

## jd-037 (keyword) SpaceX: Software Engineer - Components Test - Starshield

### clearance: status
- gold: ambiguous, preferred, active/null
> an active clearance may provide the opportunity for you to work on sensitive SpaceX missions
- model: stated, preferred, preferred/null
> Note that an active clearance may provide the opportunity for you to work on sensitive SpaceX missions

## jd-038 (keyword) Oshkosh: AI Intern

### grad_requirements: spurious
- gold: not mentioned
> (no quote)
- model: ambiguous, required, null
> Pursuing a Bachelor's or Master's degree in Computer Science, Computer Engineering, Software Engineering, Electrical Engineering, Data Science, or a related technical field

### start_options: value
- gold: stated, required, ["\"summer 2027\""]
> As an AI Engineer Intern in Summer 2027
- model: stated, required, ["\"2027-06\""]
> As an AI Engineer Intern in Summer 2027

### us_person_required: value
- gold: ambiguous, required, true
> Applicants for these positions may need to be
- model: ambiguous, required, null
> Applicants for these positions may need to be "U.S. Persons," as defined in these regulations.

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
- model: stated, required, ability_to_obtain/ts_sci
> Employees must be eligible to obtain a government security clearance
> Current eligibility for access to classified information at the Secret level or higher and may be subject to a government background investigation to upgrade clearance eligibility to the TS/SCI level

## jd-042 (keyword) Stryker: Summer 2027 Internship - Data Science - Remote

### grad_requirements: spurious
- gold: not mentioned
> (no quote)
- model: ambiguous, required, null
> Currently pursuing a Bachelor's or Master's degree in a related field; must remain enrolled in a degree-seeking program after the internship.

### citizenship_required: spurious
- gold: not mentioned
> (no quote)
- model: stated, required, false
> Must be legally authorized to work in the U.S. and not require sponsorship now or in the future.

## jd-044 (keyword) Sim: Founding Design Engineer

### citizenship_required: spurious
- gold: not mentioned
> (no quote)
- model: stated, required, false
> We sponsor visas.

### sponsorship_future_unavailable: missed
- gold: stated, required, false
> We sponsor visas.
- model: not mentioned
> (no quote)

## jd-046 (keyword) Nissan: AI Agent Architect Intern - Summer 2027 - Farmington Hills, MI

### start_options: missed
- gold: stated, required, ["\"summer 2027\""]
> AI Agent Architect Intern to join our team in Farmington Hills, MI
- model: not mentioned
> (no quote)

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
- model: stated, required, ["[[\"bs\"],null,null,\"2029-08\"]"]
> Scheduled to obtain a Bachelor's degree in a Technology, Engineering, or Mathematics field by Summer 2028 or Summer 2029

### start_options: spurious
- gold: not mentioned
> (no quote)
- model: stated, required, ["\"2027-06\""]
> University - 2027 Summer Games Software Developer Intern

## jd-052 (keyword) Klaviyo: AI Engineer 1

### grad_requirements: value
- gold: stated, required, ["[null,null,\"2026-12\",\"2027-06\"]"]
> Graduating in December 2026 or May/June 2027
- model: stated, required, ["[null,null,null,\"2027-06\"]"]
> Graduating in December 2026 or May/June 2027

## jd-053 (keyword) BNY: Data Science Analyst - Engineering

### grad_requirements: value
- gold: stated, required, ["[null,null,\"2026-12\",\"2027-05\"]"]
> Graduating in Dec 2026 or May 2027 (U.S.)
- model: stated, required, ["[null,null,null,\"2027-05\"]"]
> Graduating in Dec 2026 or May 2027 (U.S.)

### degree_levels: status
- gold: ambiguous, required, ["\"bs\""]
> Enrollment in a 4-year undergraduate degree program
- model: stated, preferred, ["\"bs\""]
> Enrollment in a 4-year undergraduate degree program with a strong focus on business-related and/or technology-related majors preferred

## jd-054 (keyword) Life Fitness: Android Software Intern

### must_return_to_school: spurious
- gold: not mentioned
> (no quote)
- model: stated, required, true
> Currently enrolled in a full-time bachelor's or master's degree program

### start_options: spurious
- gold: not mentioned
> (no quote)
- model: ambiguous, required, ["\"2027\""]
> The Life Fitness / Hammer Strength Internship Program 2027
> Collaborate with fellow interns on a 12-week cross-functional case study project

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
> BA/BS in Computer Science, Software Engineering or related field and 0-3 years of related experience, or AA in related field and 3 years of related experience; in lieu of formal education, 10 years of related experience

## jd-058 (keyword) Anduril: 2027 Finance Data Analyst Intern

### sponsorship_now_unavailable: spurious
- gold: not mentioned
> (no quote)
- model: ambiguous, required, null
> Must be authorized to work in the United States

## jd-060 (keyword) Spry Methods: Intelligence Analyst 1

### clearance: status
- gold: ambiguous, required, active/top_secret
> Top Secret Clearance is required
- model: stated, required, active/top_secret
> Top Secret Clearance is required
