// Get DOM elements
const photoInput = document.getElementById('photoInput');
const capturePhoto = document.getElementById('capturePhoto');
const photoPreview = document.getElementById('photoPreview');
const previewContainer = document.getElementById('previewContainer');
const analyzeButton = document.getElementById('analyzeButton');
const resultsSection = document.getElementById('resultsSection');

// Handle file selection
photoInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            photoPreview.src = e.target.result;
            previewContainer.classList.remove('hidden');
            analyzeButton.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
});

// Handle camera capture
capturePhoto.addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const video = document.createElement('video');
        video.srcObject = stream;
        video.play();

        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');

        await new Promise(resolve => video.onloadedmetadata = resolve);

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        photoPreview.src = canvas.toDataURL('image/jpeg');
        previewContainer.classList.remove('hidden');
        analyzeButton.classList.remove('hidden');

        stream.getTracks().forEach(track => track.stop());
    } catch (err) {
        console.error('Error accessing camera:', err);
        alert('Camera access denied or not available.');
    }
});

// Handle analyze button click
analyzeButton.addEventListener('click', async () => {
    resultsSection.innerHTML = '';
    resultsSection.classList.add('hidden');

    try {
        analyzeButton.textContent = 'Analyzing...';
        analyzeButton.disabled = true;

        let imageFile = photoInput.files[0];
        if (!imageFile) {
            const dataUrl = photoPreview.src;
            const blob = await (await fetch(dataUrl)).blob();
            imageFile = new File([blob], 'captured-image.jpg', { type: 'image/jpeg' });
        }

        // Step 1: Upload image to ImgBB
        const formData = new FormData();
        formData.append('image', imageFile);
        const imgbbResponse = await fetch('https://api.imgbb.com/1/upload?key=1e059e66831bf4e364b614f21c619428', {
            method: 'POST',
            body: formData
        });

        if (!imgbbResponse.ok) throw new Error('Failed to upload image to ImgBB');

        const imgbbData = await imgbbResponse.json();
        const imageUrl = imgbbData.data.url;

        // Step 2: Call Groq API
        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer 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'
            },
            body: JSON.stringify({
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: 'Give calories of each item in this image in this below JSON format only\n {items:[{item_name:name of item, total_calories:in gm, total_protien:in gm , toal_carbs: in gm ,toal_fats:in gm},...]}'
                            },
                            {
                                type: 'image_url',
                                image_url: { url: imageUrl }
                            }
                        ]
                    }
                ],
                model: 'meta-llama/llama-4-maverick-17b-128e-instruct',
                temperature: 1,
                max_completion_tokens: 1024,
                top_p: 1,
                stream: false,
                response_format: { type: 'json_object' }
            })
        });

        if (!groqResponse.ok) throw new Error('Failed to fetch nutritional data from Groq API');

        const groqData = await groqResponse.json();
        const nutritionalData = JSON.parse(groqData.choices[0].message.content);

        nutritionalData.items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'bg-white rounded-xl shadow-lg p-6 fade-in card-hover border border-gray-200';
            card.innerHTML = `
                <h3 class="text-xl font-bold text-indigo-600 mb-2">${item.item_name}</h3>
                <p class="text-gray-700">🔥 Calories: <span class="font-semibold">${item.total_calories}</span> kcal</p>
                <p class="text-gray-700">💪 Protein: <span class="font-semibold">${item.total_protien}</span> g</p>
                <p class="text-gray-700">🍞 Carbs: <span class="font-semibold">${item.total_carbs}</span> g</p>
                <p class="text-gray-700">📍 Fats: <span class="font-semibold">${item.total_fats}</span> g</p>
            `;
            resultsSection.appendChild(card);
        });

        resultsSection.classList.remove('hidden');
    } catch (err) {
        console.error('Error processing image:', err);
        alert('Failed to analyze food. Please try again.');
    } finally {
        analyzeButton.textContent = 'Analyze Food';
        analyzeButton.disabled = false;
    }
});
