document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Lenis Smooth Scroll ---
    const lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // smooth cubic-bezier alike
        direction: 'vertical',
        gestureDirection: 'vertical',
        smooth: true,
        smoothTouch: false,
        touchMultiplier: 2,
    });

    function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // --- 2. Magnetic Buttons ---
    const magneticElements = document.querySelectorAll('.btn-primary, .skill-card, .btn-icon');
    magneticElements.forEach(elem => {
        elem.addEventListener('mousemove', (e) => {
            const rect = elem.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            // Very light magnetism (max distance 15-20px effect)
            const power = 0.2; 
            
            elem.style.transform = `translate(${x * power}px, ${y * power}px) scale(1.02)`;
            elem.style.transition = 'transform 0.1s cubic-bezier(0.2, 0.8, 0.2, 1)';
        });
        
        elem.addEventListener('mouseleave', () => {
            elem.style.transform = 'translate(0px, 0px) scale(1)';
            elem.style.transition = 'transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)';
        });
    });

    // --- 3. App Logic & Elements ---
    const views = {
        hero: document.getElementById('view-hero'),
        skills: document.getElementById('view-skills'),
        challenges: document.getElementById('view-challenges'),
        loading: document.getElementById('view-loading'),
        assessment: document.getElementById('view-assessment'),
        results: document.getElementById('view-results')
    };
    
    const btns = {
        begin: document.getElementById('btn-begin'),
        backHero: document.getElementById('btn-back-hero'),
        generate: document.getElementById('btn-generate')
    };

    const skillCards = document.querySelectorAll('.skill-card');
    const countDisplay = document.getElementById('count-display');
    const bottomBar = document.querySelector('.bottom-action-bar');
    const loadingSubtitle = document.getElementById('loading-subtitle');

    // --- Supabase: Session ID for this assessment run ---
    let currentSessionId = null;

    let selectedSkills = new Set();
    const loadingTexts = [
        "Analyzing selected domains...",
        "Scanning for known vulnerabilities...",
        "Identifying common blindspots...",
        "Calibrating AI logic...",
        "Generating unique scenario graph..."
    ];

    // --- 4. Navigation Logic ---
    const switchView = (fromView, toView) => {
        fromView.classList.remove('active-view');
        // Wait for exit transition
        setTimeout(() => {
            fromView.classList.add('hidden-view');
            toView.classList.remove('hidden-view');
            // Small reflow delay
            setTimeout(() => {
                toView.classList.add('active-view');
            }, 50);
        }, 300); // 300ms matches css transition roughly
    };

    // --- 5. Scroll Reveal Animations (IntersectionObserver) ---
    const revealEls = document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right');
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12 });

    revealEls.forEach(el => revealObserver.observe(el));

    // Animated stat counters
    const statNumbers = document.querySelectorAll('.stat-number[data-target]');
    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            const target = parseInt(el.dataset.target);
            const duration = 1500;
            const start = performance.now();
            const tick = (now) => {
                const pct = Math.min((now - start) / duration, 1);
                el.textContent = Math.floor(pct * pct * target); // ease-in
                if (pct < 1) requestAnimationFrame(tick);
                else el.textContent = target;
            };
            requestAnimationFrame(tick);
            counterObserver.unobserve(el);
        });
    }, { threshold: 0.5 });
    statNumbers.forEach(el => counterObserver.observe(el));

    // Preview Radar Chart in About section
    const previewCanvas = document.getElementById('preview-radar');
    if (previewCanvas && typeof Chart !== 'undefined') {
        const previewCtx = previewCanvas.getContext('2d');
        new Chart(previewCtx, {
            type: 'radar',
            data: {
                labels: ['Privacy', 'Misinformation', 'Security', 'Tech Skills', 'Social Media'],
                datasets: [
                    {
                        label: 'Competence',
                        data: [62, 45, 78, 55, 70],
                        fill: true,
                        backgroundColor: 'rgba(139, 92, 246, 0.15)',
                        borderColor: '#8b5cf6',
                        pointBackgroundColor: '#8b5cf6',
                        borderWidth: 2,
                        pointRadius: 3,
                    },
                    {
                        label: 'Confidence',
                        data: [85, 80, 90, 75, 88],
                        fill: true,
                        backgroundColor: 'rgba(45, 212, 191, 0.1)',
                        borderColor: '#2dd4bf',
                        pointBackgroundColor: '#2dd4bf',
                        borderWidth: 2,
                        pointRadius: 3,
                        borderDash: [5, 3],
                    }
                ]
            },
            options: {
                responsive: false,
                plugins: { legend: { display: false } },
                scales: {
                    r: {
                        min: 0, max: 100,
                        grid: { color: 'rgba(255,255,255,0.06)' },
                        ticks: { display: false },
                        pointLabels: { color: '#a1a1aa', font: { size: 11 } },
                        angleLines: { color: 'rgba(255,255,255,0.06)' }
                    }
                }
            }
        });
    }

    // Hide/show landing page scroll sections when entering/exiting app
    const landingSections = document.getElementById('landing-sections');

    // --- 6. Events ---
    let isWeeklyChallengeActive = false;
    const btnWeeklyChallenge = document.getElementById('btn-weekly-challenge');

    // Bottom "Start Assessment" CTA
    const btnBeginBottom = document.getElementById('btn-begin-bottom');
    if (btnBeginBottom) {
        btnBeginBottom.addEventListener('click', () => {
            isWeeklyChallengeActive = false;
            if (landingSections) landingSections.style.display = 'none';
            switchView(views.hero, views.skills);
            checkSelection();
        });
    }

    btns.begin.addEventListener('click', () => {
        isWeeklyChallengeActive = false;
        if (landingSections) landingSections.style.display = 'none';
        switchView(views.hero, views.skills);
        checkSelection(); // trigger bar if they went back and forward
    });


    if (btnWeeklyChallenge) {
        btnWeeklyChallenge.addEventListener('click', () => {
            isWeeklyChallengeActive = true;
            
            // Auto select all skills for weekly challenge
            selectedSkills.clear();
            document.querySelectorAll('.skill-card').forEach(card => {
                card.classList.add('selected');
                selectedSkills.add(card.dataset.skill);
            });
            checkSelection(); // Updates the UI and enables generate
            
            // Trigger generation
            btns.generate.click();
        });
    }

    btns.backHero.addEventListener('click', () => {
        switchView(views.skills, views.hero);
        bottomBar.classList.remove('visible');
    });

    // --- Challenges Hub Navigation ---
    const btnChallenges = document.getElementById('btn-challenges');
    const btnBackHeroChallenges = document.getElementById('btn-back-hero-challenges');

    if (btnChallenges) {
        btnChallenges.addEventListener('click', () => {
            isWeeklyChallengeActive = false;
            if (landingSections) landingSections.style.display = 'none';
            switchView(views.hero, views.challenges);
        });
    }

    if (btnBackHeroChallenges) {
        btnBackHeroChallenges.addEventListener('click', () => {
            switchView(views.challenges, views.hero);
            if (landingSections) landingSections.style.display = 'block';
        });
    }

    // Handle individual challenge starts
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('start-challenge-btn')) {
            const type = e.target.dataset.challengeType;
            startSpecializedChallenge(type);
        }
    });

    function startSpecializedChallenge(type) {
        isWeeklyChallengeActive = (type === 'weekly');
        selectedSkills.clear();
        
        switch(type) {
            case 'weekly':
                document.querySelectorAll('.skill-card').forEach(card => selectedSkills.add(card.dataset.skill));
                break;
            case 'security':
                selectedSkills.add('online-safety');
                selectedSkills.add('privacy');
                selectedSkills.add('coding-basics');
                break;
            case 'media':
                selectedSkills.add('misinformation');
                selectedSkills.add('search-skills');
                selectedSkills.add('social-media');
                break;
        }

        // Highlight selected cards in the skills view (hidden) just to keep state sync
        document.querySelectorAll('.skill-card').forEach(card => {
            if (selectedSkills.has(card.dataset.skill)) card.classList.add('selected');
            else card.classList.remove('selected');
        });

        checkSelection();
        btns.generate.click();
    }

    // --- 6. Skill Selection Logic ---
    skillCards.forEach(card => {
        card.addEventListener('click', () => {
            const skill = card.dataset.skill;
            if (selectedSkills.has(skill)) {
                selectedSkills.delete(skill);
                card.classList.remove('selected');
            } else {
                selectedSkills.add(skill);
                card.classList.add('selected');
            }
            checkSelection();
        });
    });

    function checkSelection() {
        const count = selectedSkills.size;
        countDisplay.textContent = count;
        
        if (count > 0) {
            bottomBar.classList.add('visible');
            btns.generate.disabled = false;
        } else {
            bottomBar.classList.remove('visible');
            btns.generate.disabled = true;
        }
    }

    // --- 7. MOCK QUESTION BANK ---
    // In production, this data is continuously generated by Groq LLaMA to ensure 100% uniqueness.
    // For this prototype, we mock a large set of varied scenarios.
    const MOCK_DB = {
        'online-safety': [
            { q: "You receive an SMS: 'Dear HDFC customer, your account is suspended. Update KYC here: http://hdfc-kyc-update.xyz'. What is the FIRST indicator of a scam?", opts: ["It was sent via SMS instead of Email", "The URL uses .xyz instead of an official domain", "It asks to update KYC", "They used 'Dear customer' instead of your name"], ans: 1 },
            { q: "Which password behavior is the highest security risk?", opts: ["Using a 8-character password with symbols", "Writing a password on a sticky note at home", "Reusing the same strong password for your email and social media", "Changing your password every 30 days"], ans: 2 }
        ],
        'misinformation': [
            { q: "A viral WhatsApp forward shows a video of a politician saying something controversial. What's the best way to verify if it's a deepfake?", opts: ["Check if the lips sync perfectly with the audio", "Forward it to 5 friends to see what they think", "Look for unnatural lighting, blink rates, and cross-reference with major news outlets", "Use a reverse text search on Google"], ans: 2 },
            { q: "You read an article claiming a new superfood cures all known diseases. It cites a 'recent study' but provides no link. This is an example of:", opts: ["Confirmation bias", "Clickbait", "Pseudoscience without verified sourcing", "Satire"], ans: 2 }
        ],
        'privacy': [
            { q: "A new flashlight app requests access to your Contacts and Microphone. What should you do?", opts: ["Accept, maybe it uses voice commands", "Deny and uninstall, a flashlight does not need these permissions", "Accept but turn off microphone later", "Only allow while using the app"], ans: 1 },
            { q: "When you browse in 'Incognito' or 'Private' mode, what is actually happening?", opts: ["You are completely invisible to your ISP", "Websites cannot track your IP address", "Your browser does not save your local search history or cookies", "Your connection is encrypted automatically"], ans: 2 }
        ],
        'social-media': [
            { q: "Which scenario describes an 'Algorithm Filter Bubble'?", opts: ["Instagram only showing you posts that agree with your existing political views", "A hacker locking you out of your account", "When your posts get fewer likes than usual (Shadowbanning)", "A new feature on TikTok for organizing videos"], ans: 0 },
            { q: "A friend posts a photo of your group, but it reveals your location and home address in the background. What is the most literate action?", opts: ["Report the photo to Instagram", "Comment angrily", "Private message them to take it down immediately due to doxxing risks", "Save the photo and ignore it"], ans: 2 }
        ],
        'search-skills': [
            { q: "If you want to search for the exact phrase 'climate change effects' only on educational websites, what should you type in Google?", opts: ["climate change effects educational", "site:.edu \"climate change effects\"", "climate change effects OR .edu", "inurl:climate change intext:edu"], ans: 1 },
            { q: "Which source is generally considered most reliable for academic research?", opts: ["Wikipedia.org", "A blog post by a known influencer", "A peer-reviewed journal article on JSTOR", "A company's official 'About Us' page"], ans: 2 }
        ],
        'coding-basics': [
            { q: "What does HTML stand for in web development?", opts: ["Hyper Text Markup Language", "High Tech Modern Language", "Hyperlink and Text Management Logic", "Home Tool Markup Language"], ans: 0 },
            { q: "You want a computer to repeat a task 10 times. Which programming concept would you use?", opts: ["An IF statement", "A Variable", "A Loop (like 'for' or 'while')", "An Array"], ans: 2 }
        ]
    };

    // --- 8. Assessment Flow Logic ---
    let currentQuestions = [];
    let currentQuestionIndex = 0;
    let userAnswers = []; // Store { qObj, passed: boolean }

    btns.generate.addEventListener('click', async () => {
        bottomBar.classList.remove('visible');
        if (isWeeklyChallengeActive) {
             switchView(views.hero, views.loading);
        } else if (!views.challenges.classList.contains('hidden-view')) {
             switchView(views.challenges, views.loading);
        } else {
             switchView(views.skills, views.loading);
        }

        // Generate a unique session ID for this assessment
        currentSessionId = YuvataDB.generateSessionId();

        let textIndex = 0;
        const textInterval = setInterval(() => {
            textIndex = (textIndex + 1) % loadingTexts.length;
            loadingSubtitle.style.opacity = 0;
            setTimeout(() => {
                loadingSubtitle.textContent = loadingTexts[textIndex];
                loadingSubtitle.style.opacity = 1;
            }, 300);
        }, 1500);

        try {
            // CALL GROQ AI to generate live questions!
            currentQuestions = await YuvataAI.generateQuestions(Array.from(selectedSkills));
            
            clearInterval(textInterval);
            currentQuestionIndex = 0;
            userAnswers = [];

            renderQuestion(0);
            switchView(views.loading, views.assessment); 
        } catch (error) {
            clearInterval(textInterval);
            alert("Failed to generate AI Assessment. Please check your Groq API Key in Settings.\n\n" + error.message);
            bottomBar.classList.add('visible');
            switchView(views.loading, views.skills);
        }
    });

    const questionCounter = document.getElementById('question-counter');
    const currentSkillBadge = document.getElementById('current-skill-badge');
    const questionText = document.getElementById('question-text');
    const optionsContainer = document.getElementById('options-container');
    const progressFill = document.getElementById('progress-fill');
    const btnNextQuestion = document.getElementById('btn-next-question');
    const assessmentActionBar = document.getElementById('assessment-action-bar');
    
    let currentSelectedOptionIndex = null;

    function renderQuestion(index) {
        currentSelectedOptionIndex = null;
        btnNextQuestion.disabled = true;
        assessmentActionBar.style.display = 'flex'; // show bar
        
        const qObj = currentQuestions[index];
        questionCounter.textContent = `Question ${index + 1} of ${currentQuestions.length}`;
        currentSkillBadge.textContent = qObj.skillCategory.replace('-', ' ').toUpperCase();
        questionText.textContent = qObj.q;
        
        // Update progress bar
        const progressPct = ((index) / currentQuestions.length) * 100;
        progressFill.style.width = `${progressPct}%`;

        // Render Options
        optionsContainer.innerHTML = '';
        const letters = ['A', 'B', 'C', 'D'];
        qObj.opts.forEach((optText, i) => {
            const optElem = document.createElement('div');
            optElem.className = 'option-card';
            optElem.innerHTML = `
                <div class="option-letter">${letters[i]}</div>
                <div class="option-text">${optText}</div>
            `;
            
            optElem.addEventListener('click', () => {
                // Deselect others
                document.querySelectorAll('.option-card').forEach(el => el.classList.remove('selected'));
                optElem.classList.add('selected');
                currentSelectedOptionIndex = i;
                btnNextQuestion.disabled = false;
            });
            
            optionsContainer.appendChild(optElem);
        });
    }

    btnNextQuestion.addEventListener('click', () => {
        const qObj = currentQuestions[currentQuestionIndex];
        const isCorrect = currentSelectedOptionIndex === qObj.ans;
        
        userAnswers.push({
            skill: qObj.skillCategory,
            question: qObj.q,
            isCorrect: isCorrect
        });

        currentQuestionIndex++;
        
        if (currentQuestionIndex < currentQuestions.length) {
            renderQuestion(currentQuestionIndex);
        } else {
            // Finish
            progressFill.style.width = `100%`;
            finishAssessment();
        }
    });

    // --- 9. Results & Chart Logic ---
    function finishAssessment() {
        switchView(views.assessment, views.results);
        
        // Calculate Scores
        let correctCount = 0;
        const skillScores = {};
        
        userAnswers.forEach(ans => {
            if (ans.isCorrect) correctCount++;
            
            if (!skillScores[ans.skill]) {
                skillScores[ans.skill] = { total: 0, correct: 0 };
            }
            skillScores[ans.skill].total++;
            if (ans.isCorrect) skillScores[ans.skill].correct++;
        });

        const overallScorePct = Math.round((correctCount / currentQuestions.length) * 100);
        
        // Determine literacy level
        let literacyLevel = 'novice';
        let levelName = 'Digital Novice';
        let levelIcon = '🌱';
        let levelBg = '';
        let levelBorderColor = '';

        if (overallScorePct >= 90) {
            literacyLevel = 'champion';
            levelName = 'Digital Champion';
            levelIcon = '👑';
            levelBg = 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(20, 184, 166, 0.1))';
            levelBorderColor = 'var(--color-teal)';
        } else if (overallScorePct >= 70) {
            literacyLevel = 'native';
            levelName = 'Digital Native';
            levelIcon = '🛡️';
            levelBg = 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(99, 102, 241, 0.1))';
            levelBorderColor = 'var(--color-blue)';
        } else if (overallScorePct >= 40) {
            literacyLevel = 'explorer';
            levelName = 'Digital Explorer';
            levelIcon = '🧭';
            levelBg = 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(249, 115, 22, 0.1))';
            levelBorderColor = 'var(--color-orange)';
        } else {
            levelBg = 'linear-gradient(135deg, rgba(244, 63, 94, 0.2), rgba(225, 29, 72, 0.1))';
            levelBorderColor = 'var(--color-red)';
        }

        // Update DOM
        document.getElementById('final-score').textContent = `${overallScorePct}%`;
        document.querySelector('.circular-progress').style.setProperty('--progress', overallScorePct);
        
        const levelBadgeText = document.getElementById('final-level-text');
        const levelBadgeIconEl = document.querySelector('.level-icon');
        const levelBadge = document.getElementById('final-level-badge');
        
        levelBadgeText.textContent = levelName;
        levelBadgeIconEl.textContent = levelIcon;
        levelBadge.style.background = levelBg;
        levelBadge.style.borderColor = levelBorderColor;

        // Render Radar Chart
        initRadarChart(skillScores);

        // Update selected domains text on results
        const domainsEl = document.getElementById('results-domains');
        if (domainsEl) {
            domainsEl.textContent = Array.from(selectedSkills).join(', ');
        }

        // --- GROQ AI: Generate Report and Roadmap ---
        const aiReportLoading = document.getElementById('ai-report-loading');
        const aiReportContent = document.getElementById('ai-report-content');
        const ulStrengths = document.getElementById('report-strengths');
        const ulWeaknesses = document.getElementById('report-weaknesses');
        const divRoadmap = document.getElementById('report-roadmap');
        
        aiReportLoading.style.display = 'flex';
        aiReportContent.style.display = 'none';

        // Call AI in the background
        YuvataAI.generateReport(userAnswers, overallScorePct, literacyLevel)
            .then(report => {

                // --- Mentor Message ---
                const mentorMsgEl = document.getElementById('mentor-message');
                if (mentorMsgEl && report.mentorMessage) {
                    mentorMsgEl.textContent = report.mentorMessage;
                    mentorMsgEl.closest('.mentor-message-card')?.classList.add('visible');
                }

                // Populate Strengths
                ulStrengths.innerHTML = '';
                (report.strengths || []).forEach(s => {
                    const li = document.createElement('li');
                    li.textContent = s;
                    ulStrengths.appendChild(li);
                });

                // Populate Weaknesses
                ulWeaknesses.innerHTML = '';
                (report.weaknesses || []).forEach(w => {
                    const li = document.createElement('li');
                    li.textContent = w;
                    ulWeaknesses.appendChild(li);
                });

                // --- Render Phase-Based Roadmap ---
                divRoadmap.innerHTML = '';

                const diffColors = {
                    'Beginner': '#34d399',
                    'Intermediate': '#f59e0b',
                    'Advanced': '#f43f5e'
                };

                // Flatten roadmap for DB saving (backwards compat)
                const flatRoadmap = [];

                (report.roadmap || []).forEach(phase => {
                    // Phase header
                    const phaseHeader = document.createElement('div');
                    phaseHeader.className = 'roadmap-phase-header';
                    phaseHeader.innerHTML = "<span class=\"phase-emoji\">" + (phase.emoji || '📍') + "</span>"
                        + "<div><span class=\"phase-num\">Phase " + phase.phase + "</span>"
                        + "<span class=\"phase-label\">" + (phase.phaseLabel || '') + "</span></div>";
                    divRoadmap.appendChild(phaseHeader);

                    // Phase steps
                    const stepsContainer = document.createElement('div');
                    stepsContainer.className = 'roadmap-steps-container';

                    (phase.steps || []).forEach((step, idx) => {
                        flatRoadmap.push({ title: step.title, desc: step.desc });

                        const stepId = "roadmap-step-" + phase.phase + "-" + idx;
                        const diffColor = diffColors[step.difficulty] || '#a1a1aa';
                        const tags = (step.tags || []).map(t =>
                            "<span class=\"roadmap-tag\">" + t + "</span>"
                        ).join('');

                        const stepEl = document.createElement('div');
                        stepEl.className = 'roadmap-step-card';
                        stepEl.setAttribute('data-step-id', stepId);

                        stepEl.innerHTML = "<div class=\"roadmap-step-top\">"
                            + "<label class=\"roadmap-checkbox-label\" for=\"" + stepId + "\">"
                            + "<input type=\"checkbox\" id=\"" + stepId + "\" class=\"roadmap-check\" data-step-key=\"" + stepId + "\">"
                            + "<span class=\"roadmap-check-box\"></span>"
                            + "</label>"
                            + "<div class=\"roadmap-step-body\">"
                            + "<div class=\"roadmap-step-title\">" + step.title + "</div>"
                            + "<div class=\"roadmap-step-desc\">" + step.desc + "</div>"
                            + "<div class=\"roadmap-step-meta\">"
                            + "<span class=\"roadmap-difficulty\" style=\"color:" + diffColor + "; border-color:" + diffColor + "40;\">"
                            + (step.difficulty || '') + "</span>"
                            + "<span class=\"roadmap-time\">⏱ " + (step.timeEstimate || '') + "</span>"
                            + tags
                            + "</div>"
                            + (step.resourceTitle && step.resourceUrl
                                ? "<a href=\"" + step.resourceUrl + "\" target=\"_blank\" rel=\"noopener\" class=\"roadmap-resource-link\">"
                                + "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"12\" height=\"12\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6\"/><polyline points=\"15 3 21 3 21 9\"/><line x1=\"10\" y1=\"14\" x2=\"21\" y2=\"3\"/></svg>"
                                + " " + step.resourceTitle + "</a>"
                                : '')
                            + "</div>"
                            + "</div>";

                        // Checkbox interaction
                        const checkbox = stepEl.querySelector('.roadmap-check');
                        checkbox.addEventListener('change', () => {
                            stepEl.classList.toggle('step-completed', checkbox.checked);
                        });

                        stepsContainer.appendChild(stepEl);
                    });

                    divRoadmap.appendChild(stepsContainer);
                });

                aiReportLoading.style.display = 'none';
                aiReportContent.style.display = 'block';

                // --- SUPABASE: Save assessment to DB with ROADMAP ---
                if (YuvataAuth.isLoggedIn()) {
                    const scoresForDB = {};
                    Object.keys(skillScores).forEach(k => {
                        scoresForDB[k] = Math.round((skillScores[k].correct / skillScores[k].total) * 100);
                    });

                    YuvataDB.saveAssessment({
                        sessionId: currentSessionId,
                        selectedSkills: Array.from(selectedSkills),
                        questions: currentQuestions.map(q => ({ question: q.q, options: q.opts, correct: q.ans, skill: q.skillCategory })),
                        answers: userAnswers,
                        scores: scoresForDB,
                        overallScore: overallScorePct,
                        literacyLevel: literacyLevel,
                        isWeeklyChallenge: isWeeklyChallengeActive,
                        roadmap: flatRoadmap
                    }).then(saved => {
                        if (saved) {
                            console.log('[YUVATA] Assessment saved to cloud ✓');
                            showSaveStatus();
                        }
                    });
                }
            })
            .catch(err => {
                console.error(err);
                aiReportLoading.innerHTML = "<p class=\"text-muted\" style=\"color:#fb7185;\">Failed to generate AI report. Check API Key.</p>";
            });
    }

    // Show a subtle "Saved to cloud" indicator
    function showSaveStatus() {
        const scoreCard = document.querySelector('.score-card');
        if (!scoreCard) return;
        let status = scoreCard.querySelector('.save-status');
        if (!status) {
            status = document.createElement('div');
            status.className = 'save-status';
            status.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                Saved to your account
            `;
            scoreCard.appendChild(status);
        }
        setTimeout(() => status.classList.add('visible'), 500);
    }

    let radarChartInstance = null;

    function initRadarChart(skillScores) {
        const ctx = document.getElementById('radarChart').getContext('2d');
        
        const labels = Object.keys(skillScores).map(k => k.replace('-', ' ').toUpperCase());
        const data = Object.values(skillScores).map(v => (v.correct / v.total) * 100);

        if (radarChartInstance) radarChartInstance.destroy();

        radarChartInstance = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Proficiency',
                    data: data,
                    backgroundColor: 'rgba(139, 92, 246, 0.4)',
                    borderColor: '#8b5cf6',
                    pointBackgroundColor: '#2dd4bf',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: '#2dd4bf',
                    borderWidth: 2,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        pointLabels: {
                            color: '#a1a1aa',
                            font: { family: 'Satoshi', size: 12, weight: '500' }
                        },
                        ticks: {
                            display: false, // hide the numbers (0, 20, 40 etc)
                            min: 0,
                            max: 100,
                            stepSize: 20
                        }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(24, 24, 27, 0.9)',
                        titleFont: { family: 'Satoshi', size: 14 },
                        bodyFont: { family: 'Geist', size: 14 },
                        padding: 12,
                        cornerRadius: 8,
                        displayColors: false,
                        callbacks: {
                            label: function(context) {
                                return `Score: ${context.parsed.r}%`;
                            }
                        }
                    }
                }
            }
        });
    }

    // --- 10. AI Mentor Chat Logic ---
    const btnOpenChat = document.getElementById('btn-open-chat');
    const btnCloseChat = document.getElementById('btn-close-chat');
    const chatDrawer = document.getElementById('chat-drawer');
    const chatBackdrop = document.getElementById('chat-backdrop');
    const chatInput = document.getElementById('chat-input');
    const btnSendMessage = document.getElementById('btn-send-message');
    const chatMessages = document.getElementById('chat-messages');

    function toggleChat() {
        const isOpen = chatDrawer.classList.contains('open');
        if (isOpen) {
            chatDrawer.classList.remove('open');
            chatBackdrop.classList.remove('visible');
        } else {
            chatDrawer.classList.add('open');
            chatBackdrop.classList.add('visible');
            setTimeout(() => chatInput.focus(), 300);
        }
    }

    if (btnOpenChat) btnOpenChat.addEventListener('click', toggleChat);
    if (btnCloseChat) btnCloseChat.addEventListener('click', toggleChat);
    if (chatBackdrop) chatBackdrop.addEventListener('click', toggleChat);

    function appendMessage(text, isUser) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;
        msgDiv.innerHTML = `<div class="message-bubble">${text}</div>`;
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
    }

    function showTypingIndicator() {
        const ind = document.createElement('div');
        ind.className = 'typing-indicator';
        ind.id = 'typing-indicator';
        ind.innerHTML = `<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>`;
        chatMessages.appendChild(ind);
        chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
    }

    function removeTypingIndicator() {
        const ind = document.getElementById('typing-indicator');
        if (ind) ind.remove();
    }

    let chatHistory = [];

    async function handleChatSubmit() {
        const text = chatInput.value.trim();
        if (!text) return;
        
        appendMessage(text, true);
        chatInput.value = '';
        
        // Save user message to Supabase
        YuvataDB.saveChatMessage('user', text);
        chatHistory.push({ sender: 'user', text: text });
        
        showTypingIndicator();
        
        // Call GROQ AI
        const reply = await YuvataAI.chatWithMentor(chatHistory);
        
        removeTypingIndicator();
        appendMessage(reply, false);
        
        // Save AI response
        YuvataDB.saveChatMessage('assistant', reply);
        chatHistory.push({ sender: 'assistant', text: reply });
    }

    if (btnSendMessage) btnSendMessage.addEventListener('click', handleChatSubmit);
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleChatSubmit();
        });
    }

    // =========================================
    // --- 10.5. API SETTINGS LOGIC ---
    // =========================================
    const btnApiSettings = document.getElementById('btn-api-settings');
    const settingsModal = document.getElementById('settings-modal');
    const settingsBackdrop = document.getElementById('settings-backdrop');
    const inputApiKey = document.getElementById('settings-api-key');
    const btnSaveSettings = document.getElementById('btn-save-settings');
    const btnCancelSettings = document.getElementById('btn-cancel-settings');

    function openSettings() {
        settingsModal.classList.add('visible');
        settingsBackdrop.classList.add('visible');
        inputApiKey.value = localStorage.getItem('yuvata_groq_key') || '';
    }

    function closeSettings() {
        settingsModal.classList.remove('visible');
        settingsBackdrop.classList.remove('visible');
    }

    if (btnApiSettings) btnApiSettings.addEventListener('click', openSettings);
    if (btnCancelSettings) btnCancelSettings.addEventListener('click', closeSettings);
    if (settingsBackdrop) settingsBackdrop.addEventListener('click', closeSettings);
    if (btnSaveSettings) {
        btnSaveSettings.addEventListener('click', () => {
            const val = inputApiKey.value.trim();
            if (val) {
                localStorage.setItem('yuvata_groq_key', val);
            } else {
                localStorage.removeItem('yuvata_groq_key');
            }
            closeSettings();
            showToast('API Settings Saved!');
        });
    }

    // =========================================
    // --- 11. SUPABASE AUTH UI LOGIC ---
    // =========================================
    const btnLogin = document.getElementById('btn-login');
    const authModal = document.getElementById('auth-modal');
    const authBackdrop = document.getElementById('auth-backdrop');
    const btnCloseAuth = document.getElementById('btn-close-auth');
    const authTabs = document.querySelectorAll('.auth-tab');
    const authFormLogin = document.getElementById('auth-form-login');
    const authFormSignup = document.getElementById('auth-form-signup');
    const authErrorLogin = document.getElementById('auth-error-login');
    const authErrorSignup = document.getElementById('auth-error-signup');
    const userMenu = document.getElementById('user-menu');
    const btnUserToggle = document.getElementById('btn-user-toggle');
    const userDropdown = document.getElementById('user-dropdown');
    const btnLogout = document.getElementById('btn-logout');
    const btnMyHistory = document.getElementById('btn-my-history');
    const userInitial = document.getElementById('user-initial');
    const userDisplayName = document.getElementById('user-display-name');
    const dropdownEmail = document.getElementById('dropdown-email');

    // Open/Close Auth Modal
    function openAuthModal() {
        authModal.classList.add('visible');
        authBackdrop.classList.add('visible');
    }

    function closeAuthModal() {
        authModal.classList.remove('visible');
        authBackdrop.classList.remove('visible');
        authErrorLogin.textContent = '';
        authErrorSignup.textContent = '';
    }

    if (btnLogin) btnLogin.addEventListener('click', openAuthModal);
    if (btnCloseAuth) btnCloseAuth.addEventListener('click', closeAuthModal);
    if (authBackdrop) authBackdrop.addEventListener('click', closeAuthModal);

    // Auth Tab Switching
    authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            authTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const tabName = tab.dataset.authTab;
            if (tabName === 'login') {
                authFormLogin.style.display = 'flex';
                authFormSignup.style.display = 'none';
            } else {
                authFormLogin.style.display = 'none';
                authFormSignup.style.display = 'flex';
            }
            authErrorLogin.textContent = '';
            authErrorSignup.textContent = '';
        });
    });

    // Login Form Submit
    if (authFormLogin) {
        authFormLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            authErrorLogin.textContent = '';
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;
            const submitBtn = authFormLogin.querySelector('button[type="submit"] span');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Signing in...';

            try {
                await YuvataAuth.signIn(email, password);
                closeAuthModal();
                showToast('Welcome back! 🎉');
            } catch (err) {
                authErrorLogin.textContent = err.message || 'Sign in failed. Please try again.';
            } finally {
                submitBtn.textContent = originalText;
            }
        });
    }

    // Signup Form Submit
    if (authFormSignup) {
        authFormSignup.addEventListener('submit', async (e) => {
            e.preventDefault();
            authErrorSignup.textContent = '';
            const name = document.getElementById('signup-name').value.trim();
            const email = document.getElementById('signup-email').value.trim();
            const password = document.getElementById('signup-password').value;
            const submitBtn = authFormSignup.querySelector('button[type="submit"] span');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Creating...';

            try {
                await YuvataAuth.signUp(email, password, name);
                closeAuthModal();
                showToast('Account created! Welcome to YUVATA 🚀');
            } catch (err) {
                authErrorSignup.textContent = err.message || 'Sign up failed. Please try again.';
            } finally {
                submitBtn.textContent = originalText;
            }
        });
    }

    // User Menu Toggle
    if (btnUserToggle) {
        btnUserToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle('open');
        });
    }

    // Close dropdown on outside click
    document.addEventListener('click', () => {
        if (userDropdown) userDropdown.classList.remove('open');
    });

    // Logout
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            userDropdown.classList.remove('open');
            await YuvataAuth.signOut();
            showToast('Signed out successfully');
        });
    }

    // Update UI based on auth state
    function updateAuthUI(user) {
        if (user) {
            // User is logged in
            if (btnLogin) btnLogin.style.display = 'none';
            if (userMenu) userMenu.style.display = 'block';
            if (userInitial) userInitial.textContent = YuvataAuth.getInitials();
            if (userDisplayName) userDisplayName.textContent = YuvataAuth.getDisplayName();
            if (dropdownEmail) dropdownEmail.textContent = user.email;
        } else {
            // User is logged out
            if (btnLogin) btnLogin.style.display = 'inline-flex';
            if (userMenu) userMenu.style.display = 'none';
        }
    }

    // Listen for auth state changes
    document.addEventListener('yuvata-auth-changed', (e) => {
        updateAuthUI(e.detail.user);
    });

    // Toast notification
    function showToast(message) {
        let toast = document.querySelector('.auth-success-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'auth-success-toast';
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.classList.add('visible');
        setTimeout(() => toast.classList.remove('visible'), 3000);
    }

    // =========================================
    // --- 12. ASSESSMENT HISTORY ---
    // =========================================
    const historyModal = document.getElementById('history-modal');
    const historyBackdrop = document.getElementById('history-backdrop');
    const historyList = document.getElementById('history-list');
    const btnCloseHistory = document.getElementById('btn-close-history');

    function openHistory() {
        historyModal.classList.add('visible');
        historyBackdrop.classList.add('visible');
        loadHistory();
    }

    function closeHistory() {
        historyModal.classList.remove('visible');
        historyBackdrop.classList.remove('visible');
    }

    if (btnMyHistory) btnMyHistory.addEventListener('click', () => {
        userDropdown.classList.remove('open');
        openHistory();
    });
    if (btnCloseHistory) btnCloseHistory.addEventListener('click', closeHistory);
    if (historyBackdrop) historyBackdrop.addEventListener('click', closeHistory);

    async function loadHistory() {
        historyList.innerHTML = '<p class="text-muted" style="text-align:center;padding:24px;">Loading...</p>';
        const assessments = await YuvataDB.getAssessments();

        if (assessments.length === 0) {
            historyList.innerHTML = '<div class="history-empty"><p class="text-muted">No assessments yet. Take your first one!</p></div>';
            return;
        }

        historyList.innerHTML = '';
        assessments.forEach(a => {
            const date = new Date(a.created_at).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });
            const skills = (a.selected_skills || []).map(s => s.replace('-', ' ')).join(', ');
            const emoji = a.literacy_level === 'champion' ? '👑' : a.literacy_level === 'native' ? '🛡️' : a.literacy_level === 'explorer' ? '🧭' : '🌱';
            const levelName = a.literacy_level ? a.literacy_level.charAt(0).toUpperCase() + a.literacy_level.slice(1) : 'N/A';
            
            const scoreColor = a.overall_score >= 70 
                ? 'background: rgba(16, 185, 129, 0.15); color: #34d399;' 
                : a.overall_score >= 40 
                ? 'background: rgba(245, 158, 11, 0.15); color: #fbbf24;' 
                : 'background: rgba(244, 63, 94, 0.15); color: #fb7185;';

            const card = document.createElement('div');
            card.className = 'history-card';
            card.innerHTML = `
                <div class="history-card-info" style="flex:1;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <h4>${skills || 'Assessment'}</h4>
                        ${a.is_weekly_challenge ? '<span class="badge-pill" style="font-size:0.7rem; padding: 2px 6px; background: rgba(239, 68, 68, 0.2); color:#ef4444;">CTL</span>' : ''}
                    </div>
                    <span class="history-date">${date}</span>
                </div>
                <div class="history-card-score" style="display:flex; align-items:center; gap:12px;">
                    ${a.roadmap && a.roadmap.length > 0 
                        ? `<button class="btn-outline btn-sm btn-track-roadmap shine-effect" data-id="${a.id}">🗺️ Track</button>` 
                        : ''}
                    <div style="display:flex; align-items:center; gap:4px;">
                        <span class="history-score-badge" style="${scoreColor}">${Math.round(a.overall_score)}%</span>
                        <span class="history-level-emoji" title="${levelName}" style="margin-left: 4px;">${emoji}</span>
                    </div>
                </div>
            `;
            
            const trackBtn = card.querySelector('.btn-track-roadmap');
            if (trackBtn) {
                trackBtn.addEventListener('click', () => openRoadmapTracker(a));
            }

            historyList.appendChild(card);
        });
    }

    // =========================================
    // --- 13. ROADMAP TRACKER LOGIC ---
    // =========================================
    const roadmapModal = document.getElementById('roadmap-modal');
    const btnCloseRoadmap = document.getElementById('btn-close-roadmap');
    const trackerList = document.getElementById('roadmap-tracker-list');

    function openRoadmapTracker(assessmentData) {
        roadmapModal.classList.add('visible');
        trackerList.innerHTML = '';
        
        let localRoadmap = JSON.parse(JSON.stringify(assessmentData.roadmap));

        localRoadmap.forEach((item, index) => {
            const row = document.createElement('label');
            row.style.display = 'flex';
            row.style.gap = '12px';
            row.style.padding = '12px';
            row.style.background = 'rgba(255,255,255,0.03)';
            row.style.borderRadius = '8px';
            row.style.cursor = 'pointer';
            row.style.alignItems = 'flex-start';

            const isChecked = item.completed ? 'checked' : '';
            row.innerHTML = `
                <input type="checkbox" style="margin-top: 4px; accent-color: var(--primary); transform: scale(1.2);" ${isChecked}>
                <div>
                    <strong style="color: ${item.completed ? 'var(--text-muted)' : 'var(--text-main)'}; text-decoration: ${item.completed ? 'line-through' : 'none'}; transition: all 0.3s;">${item.title}</strong>
                    <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 4px;">${item.desc}</p>
                </div>
            `;

            const cb = row.querySelector('input');
            cb.addEventListener('change', async (e) => {
                localRoadmap[index].completed = e.target.checked;
                
                // update UI locally
                const titleEl = row.querySelector('strong');
                if (e.target.checked) {
                    titleEl.style.textDecoration = 'line-through';
                    titleEl.style.color = 'var(--text-muted)';
                } else {
                    titleEl.style.textDecoration = 'none';
                    titleEl.style.color = 'var(--text-main)';
                }

                // Sync to Supabase
                await YuvataDB.updateRoadmap(assessmentData.id, localRoadmap);
                assessmentData.roadmap = localRoadmap; // mutate cached object silently
            });

            trackerList.appendChild(row);
        });
    }

    if (btnCloseRoadmap) {
        btnCloseRoadmap.addEventListener('click', () => roadmapModal.classList.remove('visible'));
    }

    // =========================================
    // --- 14. LEADERBOARD (CTL) LOGIC ---
    // =========================================
    const leaderboardModal = document.getElementById('leaderboard-modal');
    const btnLeaderboard = document.getElementById('btn-leaderboard');
    const btnCloseLeaderboard = document.getElementById('btn-close-leaderboard');
    const leaderboardList = document.getElementById('leaderboard-list');

    async function openLeaderboard() {
        leaderboardModal.classList.add('visible');
        historyBackdrop.classList.add('visible');
        leaderboardList.innerHTML = '<p class="text-muted" style="text-align:center;padding:24px;">Fetching top hackers...</p>';
        
        const topScores = await YuvataDB.getLeaderboard();

        if (topScores.length === 0) {
            leaderboardList.innerHTML = '<div class="history-empty"><p class="text-muted">No one has braved the Weekly Challenge yet!</p></div>';
            return;
        }

        leaderboardList.innerHTML = '';
        topScores.forEach((s, idx) => {
            const medal = idx === 0 ? '🏆' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx+1}`;
            
            const card = document.createElement('div');
            card.className = 'history-card shine-effect';
            card.style.background = idx === 0 ? 'rgba(251, 191, 36, 0.1)' : '';
            card.innerHTML = `
                <div style="display:flex; align-items:center; gap:16px;">
                    <span style="font-size: 1.5rem; width: 30px; text-align:center;">${medal}</span>
                    <div>
                        <h4 style="color:var(--text-main);">${s.profiles?.display_name || 'Anonymous User'}</h4>
                    </div>
                </div>
                <div class="history-card-score">
                    <span class="history-score-badge" style="background: rgba(139, 92, 246, 0.2); color: #c4b5fd;">${Math.round(s.overall_score)}%</span>
                </div>
            `;
            leaderboardList.appendChild(card);
        });
    }

    if (btnLeaderboard) btnLeaderboard.addEventListener('click', () => {
        if(userDropdown) userDropdown.classList.remove('open');
        openLeaderboard();
    });
    if (btnCloseLeaderboard) btnCloseLeaderboard.addEventListener('click', () => {
        leaderboardModal.classList.remove('visible');
        historyBackdrop.classList.remove('visible');
    });

    // =========================================
    // --- 15. DANGER LABS LOGIC ---
    // =========================================
    const btnDangerLab = document.getElementById('btn-danger-lab');
    const labModal = document.getElementById('lab-modal');
    const btnCloseLab = document.getElementById('btn-close-lab');
    const btnStartLab = document.getElementById('btn-start-lab');
    const labIntro = document.getElementById('lab-intro');
    const labLoading = document.getElementById('lab-loading');
    const labGame = document.getElementById('lab-game');
    const labCards = document.getElementById('lab-cards');
    const labResult = document.getElementById('lab-result');
    const labResultTitle = document.getElementById('lab-result-title');
    const labResultDesc = document.getElementById('lab-result-desc');
    const btnPlayAgainLab = document.getElementById('btn-play-again-lab');

    let currentLabScenario = null;

    if (btnDangerLab) {
        btnDangerLab.addEventListener('click', () => {
            labModal.classList.add('visible');
            historyBackdrop.classList.add('visible');
            resetLabUI();
        });
    }

    if (btnCloseLab) {
        btnCloseLab.addEventListener('click', () => {
            labModal.classList.remove('visible');
            historyBackdrop.classList.remove('visible');
        });
    }

    function resetLabUI() {
        labIntro.style.display = 'block';
        labLoading.style.display = 'none';
        labGame.style.display = 'none';
        labResult.style.display = 'none';
        labCards.innerHTML = '';
        currentLabScenario = null;
    }

    if (btnStartLab) {
        btnStartLab.addEventListener('click', async () => {
            labIntro.style.display = 'none';
            labResult.style.display = 'none';
            labLoading.style.display = 'flex';
            labGame.style.display = 'none';
            labCards.innerHTML = '';

            try {
                currentLabScenario = await YuvataAI.generateLabScenario();
                renderLabScenario();
            } catch (err) {
                alert("Groq AI failed to build the lab scenario. Check API keys.\n\n" + err.message);
                resetLabUI();
            }
        });
    }

    function renderLabScenario() {
        labLoading.style.display = 'none';
        labGame.style.display = 'block';
        
        labCards.innerHTML = `<h3 class="mb-sm" style="color:var(--text-main);">${currentLabScenario.scenarioType}</h3><p class="text-muted mb-md">Click the ONE item below that is an AI-generated fake / malicious trap.</p>`;
        
        currentLabScenario.items.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = 'history-card shine-effect';
            card.style.cursor = 'pointer';
            card.innerHTML = `
                <div style="font-size: 0.95rem; line-height: 1.5; color: var(--text-main); pointer-events: none;">
                    ${item.text.replace(/\n/g, '<br>')}
                </div>
            `;
            
            card.addEventListener('click', () => handleLabAnswer(item, card));
            labCards.appendChild(card);
        });
    }

    function handleLabAnswer(selectedItem, elCard) {
        // Disable further clicking
        const allCards = labCards.querySelectorAll('.history-card');
        allCards.forEach(c => c.style.pointerEvents = 'none');
        
        labResult.style.display = 'block';

        if (selectedItem.isFake) {
            // Success
            elCard.style.border = '1px solid #10b981';
            elCard.style.background = 'rgba(16, 185, 129, 0.1)';
            labResultTitle.textContent = "🎯 Threat Eliminated!";
            labResultTitle.style.color = "#34d399";
            labResult.style.border = "1px solid rgba(16, 185, 129, 0.3)";
        } else {
            // Failed
            elCard.style.border = '1px solid #ef4444';
            elCard.style.background = 'rgba(239, 68, 68, 0.1)';
            labResultTitle.textContent = "💥 You Got Hacked!";
            labResultTitle.style.color = "#fb7185";
            labResult.style.border = "1px solid rgba(239, 68, 68, 0.3)";
            
            // Highlight the actual fake
            const actualFakeIdx = currentLabScenario.items.findIndex(i => i.isFake);
            const actualFakeCard = allCards[actualFakeIdx];
            actualFakeCard.style.border = '1px dashed #ef4444';
        }

        labResultDesc.innerHTML = `<b>Evaluation:</b> ${selectedItem.explanation}`;
    }

    if (btnPlayAgainLab) {
        btnPlayAgainLab.addEventListener('click', () => btnStartLab.click());
    }

    // =========================================
    // --- 16. CAMPAIGN HUB LOGIC ---
    // =========================================
    const btnCampaignNav = document.getElementById('btn-campaign');
    const campaignModal = document.getElementById('campaign-modal');
    const btnCloseCampaign = document.getElementById('btn-close-campaign');
    
    const campaignIntro = document.getElementById('campaign-intro');
    const campaignLoading = document.getElementById('campaign-loading');
    const campaignResult = document.getElementById('campaign-result');
    
    const btnGenerateCampaign = document.getElementById('btn-generate-campaign');
    const campaignTopicInput = document.getElementById('campaign-topic');
    const topicChips = document.querySelectorAll('.topic-chip');
    
    const canvasEmoji = document.getElementById('canvas-emoji');
    const canvasSlogan = document.getElementById('canvas-slogan');
    const campaignCaption = document.getElementById('campaign-caption');
    const campaignCanvasWrap = document.getElementById('campaign-canvas');
    const themeBtns = document.querySelectorAll('.bg-theme-btn');
    
    const btnDownloadCampaign = document.getElementById('btn-download-campaign');
    const btnNewCampaign = document.getElementById('btn-new-campaign');

    if (btnCampaignNav) {
        btnCampaignNav.addEventListener('click', () => {
            if(userDropdown) userDropdown.classList.remove('open');
            campaignModal.classList.add('visible');
            historyBackdrop.classList.add('visible');
            resetCampaignUI();
        });
    }

    if (btnCloseCampaign) {
        btnCloseCampaign.addEventListener('click', () => {
            campaignModal.classList.remove('visible');
            historyBackdrop.classList.remove('visible');
        });
    }

    function resetCampaignUI() {
        campaignIntro.style.display = 'block';
        campaignLoading.style.display = 'none';
        campaignResult.style.display = 'none';
        campaignTopicInput.value = '';
    }

    topicChips.forEach(chip => {
        chip.addEventListener('click', () => {
            campaignTopicInput.value = chip.dataset.topic;
            btnGenerateCampaign.click(); // auto-start
        });
    });

    if (btnGenerateCampaign) {
        btnGenerateCampaign.addEventListener('click', async () => {
            const topic = campaignTopicInput.value.trim() || 'Online Safety';
            
            campaignIntro.style.display = 'none';
            campaignLoading.style.display = 'flex';
            campaignResult.style.display = 'none';

            try {
                const assets = await YuvataAI.generateCampaignAssets(topic);
                
                // Populate Canvas
                canvasSlogan.textContent = assets.slogan;
                canvasEmoji.textContent = assets.emoji;
                campaignCaption.textContent = "\"" + assets.caption + "\"";
                
                campaignLoading.style.display = 'none';
                campaignResult.style.display = 'flex';
                
            } catch (err) {
                alert("Failed to generate campaign assets. Please try again!\n\n" + (err.message || ''));
                resetCampaignUI();
            }
        });
    }

    // Handle Theme changes for canvas
    themeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            campaignCanvasWrap.style.background = btn.dataset.theme;
            // update border to show selected
            themeBtns.forEach(b => b.style.borderColor = 'rgba(255,255,255,0.2)');
            btn.style.borderColor = '#4f46e5';
        });
    });

    // Generate PNG via HTML2Canvas
    if (btnDownloadCampaign) {
        btnDownloadCampaign.addEventListener('click', async () => {
            const originalTransform = campaignCanvasWrap.style.transform;
            campaignCanvasWrap.style.transform = 'none'; // reset for clean render
            
            try {
                btnDownloadCampaign.textContent = "Processing...";
                const canvas = await html2canvas(campaignCanvasWrap, {
                    backgroundColor: null,
                    scale: 2 // High res export
                });
                
                const link = document.createElement('a');
                link.download = 'yuvata-campaign-graphic.png';
                link.href = canvas.toDataURL('image/png');
                link.click();
            } catch (e) {
                console.error("Canvas export failed:", e);
                alert("Failed to export Canvas. Try another browser.");
            } finally {
                campaignCanvasWrap.style.transform = originalTransform;
                btnDownloadCampaign.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg> Download Graphic';
            }
        });
    }

    if (btnNewCampaign) {
        btnNewCampaign.addEventListener('click', resetCampaignUI);
    }

    // =========================================
    // --- 17. SQUAD MODE LOGIC ---
    // =========================================
    const btnSquadNav = document.getElementById('btn-squad-mode');
    const squadModal = document.getElementById('squad-modal');
    const btnCloseSquad = document.getElementById('btn-close-squad');
    const squadIntro = document.getElementById('squad-intro');
    const squadLoading = document.getElementById('squad-loading');
    const squadRoom = document.getElementById('squad-room');
    
    const btnCreateSquad = document.getElementById('btn-create-squad');
    const squadJoinInput = document.getElementById('squad-join-code');
    const btnJoinSquad = document.getElementById('btn-join-squad');
    
    // Room elements
    const roomTitle = document.getElementById('squad-room-title');
    const roomCodeDisplay = document.getElementById('squad-room-code-display');
    const roomDesc = document.getElementById('squad-room-desc');
    const artifactsArea = document.getElementById('squad-artifacts');
    const votesList = document.getElementById('squad-votes-list');
    
    const btnVoteFake = document.getElementById('btn-vote-fake');
    const btnVoteReal = document.getElementById('btn-vote-real');

    let currentSquadRoom = null;
    let autoRefresher = null;

    if (btnSquadNav) {
        btnSquadNav.addEventListener('click', () => {
            if (!YuvataAuth.isLoggedIn()) {
                alert("You must login to join or create a Squad!");
                authModal.style.display = 'flex';
                authBackdrop.style.display = 'block';
                return;
            }
            squadModal.classList.add('visible');
            historyBackdrop.classList.add('visible');
            resetSquadUI();
        });
    }

    if (btnCloseSquad) {
        btnCloseSquad.addEventListener('click', () => {
            squadModal.classList.remove('visible');
            historyBackdrop.classList.remove('visible');
            if (autoRefresher) clearInterval(autoRefresher);
        });
    }

    function resetSquadUI() {
        squadIntro.style.display = 'block';
        squadLoading.style.display = 'none';
        squadRoom.style.display = 'none';
        squadJoinInput.value = '';
        currentSquadRoom = null;
        if (autoRefresher) clearInterval(autoRefresher);
    }

    if (btnCreateSquad) {
        btnCreateSquad.addEventListener('click', async () => {
            squadIntro.style.display = 'none';
            squadLoading.style.display = 'flex';
            document.getElementById('squad-status-text').textContent = "AI is generating a complex cyber mystery...";

            try {
                // 1. Generate Mystery
                const mystery = await YuvataAI.generateSquadMystery();
                // 2. Create Room in DB
                currentSquadRoom = await YuvataDB.createSquadRoom(mystery.title, mystery);
                
                // 3. Enter Room
                enterSquadRoomUi(currentSquadRoom);
            } catch (err) {
                alert("Failed to create room: " + err.message);
                resetSquadUI();
            }
        });
    }

    if (btnJoinSquad) {
        btnJoinSquad.addEventListener('click', async () => {
            const code = squadJoinInput.value.trim().toUpperCase();
            if (!code || code.length !== 6) return alert("Enter a valid 6-character room code.");
            
            squadIntro.style.display = 'none';
            squadLoading.style.display = 'flex';
            document.getElementById('squad-status-text').textContent = "Locating Squad Room...";

            try {
                const room = await YuvataDB.getSquadRoomByCode(code);
                if (!room) throw new Error("Room not found or expired.");
                
                currentSquadRoom = room;
                enterSquadRoomUi(currentSquadRoom);
            } catch (err) {
                alert(err.message);
                resetSquadUI();
            }
        });
    }

    function enterSquadRoomUi(room) {
        squadLoading.style.display = 'none';
        squadRoom.style.display = 'flex';
        
        const mystery = room.mystery_data;
        roomTitle.textContent = mystery.title;
        roomCodeDisplay.textContent = room.room_code;
        roomDesc.textContent = mystery.description;
        
        artifactsArea.innerHTML = '';
        mystery.artifacts.forEach(art => {
            const a = document.createElement('div');
            a.style.padding = '12px';
            a.style.background = 'rgba(0,0,0,0.3)';
            a.style.border = '1px solid var(--border-color)';
            a.style.borderRadius = '8px';
            a.style.color = 'var(--text-main)';
            a.style.fontSize = '0.9rem';
            a.textContent = art;
            artifactsArea.appendChild(a);
        });

        // Reset Vote UI
        btnVoteFake.disabled = false;
        btnVoteReal.disabled = false;
        btnVoteFake.style.opacity = '1';
        btnVoteReal.style.opacity = '1';

        refreshVotesList(room.votes || []);

        // Start Auto polling (since we skip WebSockets for this async build)
        if (autoRefresher) clearInterval(autoRefresher);
        autoRefresher = setInterval(async () => {
            if (!currentSquadRoom) return clearInterval(autoRefresher);
            const freshRoom = await YuvataDB.getSquadRoomByCode(room.room_code);
            if (freshRoom) {
                currentSquadRoom = freshRoom;
                refreshVotesList(freshRoom.votes || []);
            }
        }, 3000);
    }

    function refreshVotesList(votes) {
        votesList.innerHTML = '';
        if (votes.length === 0) {
            votesList.innerHTML = '<span class="text-muted" style="font-size:0.85rem;">Waiting for squad to vote...</span>';
            return;
        }

        const myId = YuvataAuth.getUser()?.id;
        let iVoted = false;

        votes.forEach(v => {
            if (v.userId === myId) iVoted = true;
            
            const badge = document.createElement('div');
            badge.style.padding = '8px 12px';
            badge.style.borderRadius = '6px';
            badge.style.display = 'flex';
            badge.style.justifyContent = 'space-between';
            badge.style.border = '1px solid var(--border-color)';
            badge.style.background = 'rgba(255,255,255,0.02)';
            
            const decisionStr = v.decision === 'fake' ? '🚨 Voted Fake' : '✅ Voted Legit';
            const color = v.decision === 'fake' ? '#fca5a5' : '#6ee7b7';
            
            badge.innerHTML = "<span style='color:var(--text-main); font-size:0.9rem;'>" + (v.displayName || 'Squad Member') + "</span><span style='color:" + color + "; font-size:0.85rem; font-weight:bold;'>" + decisionStr + "</span>";
            votesList.appendChild(badge);
        });

        if (iVoted) {
            btnVoteFake.disabled = true;
            btnVoteReal.disabled = true;
            btnVoteFake.style.opacity = '0.5';
            btnVoteReal.style.opacity = '0.5';
        }
    }

    async function handleSquadVote(decision) {
        if (!currentSquadRoom) return;
        const user = YuvataAuth.getUser();
        if (!user) return;

        btnVoteFake.disabled = true;
        btnVoteReal.disabled = true;

        try {
            const freshRoom = await YuvataDB.submitSquadVote(
                currentSquadRoom.id, 
                decision, 
                user.id, 
                user.user_metadata?.display_name || user.email.split('@')[0]
            );
            currentSquadRoom = freshRoom;
            refreshVotesList(freshRoom.votes);
        } catch(err) {
            console.error("Vote failed", err);
            alert("Failed to cast vote.");
            btnVoteFake.disabled = false;
            btnVoteReal.disabled = false;
        }
    }

    if (btnVoteFake) btnVoteFake.addEventListener('click', () => handleSquadVote('fake'));
    if (btnVoteReal) btnVoteReal.addEventListener('click', () => handleSquadVote('real'));


    // =========================================
    // --- 18. EXPORT DIGITAL FITNESS CERTIFICATE & PWA ---
    // =========================================
    const btnExportReport = document.getElementById('btn-export-report');
    if (btnExportReport) {
        btnExportReport.addEventListener('click', async () => {
            const resultsView = document.getElementById('view-results');
            if (!resultsView) return;
            
            // Stash original button text
            const ogHtml = btnExportReport.innerHTML;
            btnExportReport.innerHTML = "Generating Certificate...";
            btnExportReport.style.opacity = '0.7';
            btnExportReport.style.pointerEvents = 'none';
            
            try {
                // html2canvas to save the beautiful results summary dashboard
                const canvas = await html2canvas(resultsView, {
                    backgroundColor: '#030014', // Match the dark theme bg
                    scale: 2 // High res
                });
                
                const link = document.createElement('a');
                link.download = `YUVATA-Digital-Fitness-Certificate-${new Date().toISOString().split('T')[0]}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            } catch (err) {
                console.error("Export failed:", err);
                alert("Could not export certificate. Try using a newer browser version.");
            } finally {
                btnExportReport.innerHTML = ogHtml;
                btnExportReport.style.opacity = '1';
                btnExportReport.style.pointerEvents = 'auto';
            }
        });
    }

    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js').then(registration => {
                console.log('SW registered: ', registration.scope);
            }).catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
        });
    }

    // =========================================
    // --- 19. INITIALIZE SUPABASE AUTH ---
    // =========================================
    YuvataAuth.init().then(user => {
        updateAuthUI(user);
        console.log('[YUVATA] Auth initialized:', user ? 'logged in' : 'anonymous');
    });

});
