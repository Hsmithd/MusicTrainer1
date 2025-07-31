from django.contrib import messages
from django.contrib.auth import authenticate, login
from django.shortcuts import render, redirect
import subprocess
import os
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from App.forms import CustomUserCreationForm


# Create your views here.


def index(request):
    return render(request, 'App/index.html')


def login_view(request):
    if request.method == "POST":
        username = request.POST.get("username")
        password = request.POST.get("password")
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            return redirect(index)
        else:
            messages.error(request, "Invalid username or password")
    return render(request, "App/Login.html")

def signup_view(request):
    if request.method == "POST":
        form = CustomUserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            return redirect(index)
    else:
        form = CustomUserCreationForm()
    return render(request, "App/Sign_Up.html", {"form": form})


@csrf_exempt
@require_http_methods(["POST"])
def generate_etude(request):
    try:
        script_path = os.path.join(os.path.dirname(__file__), '..', 'melodyt5', 'inference.py')

        command = [
            'python', script_path,
            '-num_tunes', '1',
            '-max_patch', '128',
            '-top_p', '0.8',
            '-top_k', '8',
            '-temperature', '2.6',
            '-show_control_code', 'True'
        ]

        # Run the inference script
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            cwd=os.path.join(os.path.dirname(__file__), '..', 'melodyt5')
        )

        if result.returncode == 0:
            # Read the generated output file
            output_dir = os.path.join(os.path.dirname(__file__), '..', 'melodyt5', 'output_tunes')

            # Get the most recent .abc file
            abc_files = [f for f in os.listdir(output_dir) if f.endswith('.abc')]
            if abc_files:
                latest_file = max(abc_files, key=lambda x: os.path.getctime(os.path.join(output_dir, x)))

                with open(os.path.join(output_dir, latest_file), 'r') as f:
                    abc_content = f.read()

                return JsonResponse({
                    'success': True,
                    'abc_notation': abc_content,
                    'message': 'Etude generated successfully'
                })
            else:
                return JsonResponse({
                    'success': False,
                    'error': 'No output file generated'
                })
        else:
            return JsonResponse({
                'success': False,
                'error': result.stderr or 'Script execution failed'
            })

    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        })